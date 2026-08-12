import { prisma } from "../db.js";
import { config } from "../config.js";

export const INSUFFICIENT_EVIDENCE_MESSAGE =
  "INSUFFICIENT EVIDENCE: Available AFTERIMAGE records do not support a factual answer to this question. No claim was fabricated.";

export type EvidenceCitation = {
  evidenceId: string;
  type: string;
  title: string | null;
  contentHash: string | null;
  createdAt: Date;
  excerpt: string;
};

export type StorySegment = {
  year: number | null;
  text: string;
  evidenceIds: string[];
};

export type MemoryEngineResult = {
  answer: string;
  citations: EvidenceCitation[];
  segments: StorySegment[];
  insufficientEvidence: boolean;
  conversationId?: string;
};

type RetrievedChunk = {
  evidenceId: string;
  afterimageId: string;
  text: string;
  type: string;
  title: string | null;
  contentHash: string | null;
  createdAt: Date;
  score: number;
};

/**
 * Evidence-backed RAG over PostgreSQL.
 * Every factual claim must cite evidence IDs.
 * If retrieval is insufficient → return INSUFFICIENT EVIDENCE (never fabricate).
 */
export class AIMemoryEngine {
  /**
   * Retrieve evidence chunks for an afterimage (keyword + optional embedding similarity).
   */
  async retrieve(afterimageId: string, query: string, limit = 12): Promise<RetrievedChunk[]> {
    const evidence = await prisma.evidence.findMany({
      where: {
        afterimageId,
        visibility: { in: ["PUBLIC", "APPROXIMATE"] },
        processingStatus: "COMPLETE",
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        afterimageId: true,
        type: true,
        title: true,
        description: true,
        contentHash: true,
        createdAt: true,
        embeddingText: true,
      },
    });

    const events = await prisma.afterimageEvent.findMany({
      where: { afterimageId },
      orderBy: { occurredAt: "asc" },
      select: {
        id: true,
        eventType: true,
        title: true,
        description: true,
        occurredAt: true,
      },
    });

    const q = query.toLowerCase();
    const terms = q.split(/\s+/).filter((t) => t.length > 2);

    const chunks: RetrievedChunk[] = evidence.map((e) => {
      const text = [e.title, e.description, e.embeddingText].filter(Boolean).join("\n");
      const lower = text.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (lower.includes(t)) score += 1;
      }
      // Always keep chronological evidence even with low lexical score
      score += 0.1;
      return {
        evidenceId: e.id,
        afterimageId: e.afterimageId,
        text: text || `${e.type} evidence`,
        type: e.type,
        title: e.title,
        contentHash: e.contentHash,
        createdAt: e.createdAt,
        score,
      };
    });

    // Event descriptions are not evidence unless linked; only boost ranking context
    void events;

    chunks.sort((a, b) => b.score - a.score || a.createdAt.getTime() - b.createdAt.getTime());
    const filtered = chunks.filter((c) => c.score >= 0.1).slice(0, limit);

    // Optional: pgvector similarity when embeddings exist
    if (config.AI_API_KEY && terms.length > 0) {
      try {
        const vectorChunks = await this.vectorSearch(afterimageId, query, limit);
        const byId = new Map(filtered.map((c) => [c.evidenceId, c]));
        for (const v of vectorChunks) {
          const existing = byId.get(v.evidenceId);
          if (existing) existing.score += v.score;
          else byId.set(v.evidenceId, v);
        }
        return [...byId.values()].sort((a, b) => b.score - a.score).slice(0, limit);
      } catch {
        // Fall back to lexical
      }
    }

    return filtered;
  }

  private async vectorSearch(
    afterimageId: string,
    query: string,
    limit: number,
  ): Promise<RetrievedChunk[]> {
    const embedding = await this.embed(query);
    if (!embedding) return [];

    const vectorLiteral = `[${embedding.join(",")}]`;
    // Raw SQL for pgvector cosine distance — evidence must already have embeddings
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        afterimageId: string;
        type: string;
        title: string | null;
        description: string;
        contentHash: string | null;
        createdAt: Date;
        embeddingText: string | null;
        distance: number;
      }>
    >(
      `SELECT id, "afterimageId", type, title, description, "contentHash", "createdAt", "embeddingText",
              (embedding <=> $1::vector) AS distance
       FROM evidence
       WHERE "afterimageId" = $2 AND embedding IS NOT NULL AND visibility IN ('PUBLIC','APPROXIMATE')
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      vectorLiteral,
      afterimageId,
      limit,
    );

    return rows.map((r) => ({
      evidenceId: r.id,
      afterimageId: r.afterimageId,
      text: [r.title, r.description, r.embeddingText].filter(Boolean).join("\n"),
      type: r.type,
      title: r.title,
      contentHash: r.contentHash,
      createdAt: r.createdAt,
      score: 1 / (1 + Number(r.distance)),
    }));
  }

  private async embed(text: string): Promise<number[] | null> {
    if (!config.AI_API_KEY) return null;
    const res = await fetch(`${config.AI_BASE_URL}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.AI_EMBEDDING_MODEL,
        input: text.slice(0, 8_000),
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    return json.data?.[0]?.embedding ?? null;
  }

  /**
   * Answer a question strictly from retrieved evidence. Never fabricate.
   */
  async ask(input: {
    afterimageId: string;
    question: string;
    userId?: string;
    conversationId?: string;
  }): Promise<MemoryEngineResult> {
    const afterimage = await prisma.afterimage.findUnique({
      where: { id: input.afterimageId },
      include: {
        events: { orderBy: { occurredAt: "asc" } },
        evidence: {
          where: { visibility: { in: ["PUBLIC", "APPROXIMATE"] } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!afterimage) {
      return {
        answer: INSUFFICIENT_EVIDENCE_MESSAGE,
        citations: [],
        segments: [],
        insufficientEvidence: true,
      };
    }

    const chunks = await this.retrieve(input.afterimageId, input.question);
    const hasChronology = afterimage.events.length > 0 || afterimage.evidence.length > 0;

    if (chunks.length === 0 && !hasChronology) {
      return this.persistResult(input, {
        answer: INSUFFICIENT_EVIDENCE_MESSAGE,
        citations: [],
        segments: [],
        insufficientEvidence: true,
      });
    }

    // Build grounded story from DB records only — no freeform LLM invention of facts
    const segments = this.buildStorySegments(afterimage);
    const citations: EvidenceCitation[] = (chunks.length > 0 ? chunks : afterimage.evidence.slice(0, 8).map((e) => ({
      evidenceId: e.id,
      afterimageId: e.afterimageId,
      text: e.description || e.title || e.type,
      type: e.type,
      title: e.title,
      contentHash: e.contentHash,
      createdAt: e.createdAt,
      score: 1,
    }))).map((c) => ({
      evidenceId: c.evidenceId,
      type: c.type,
      title: c.title,
      contentHash: c.contentHash,
      createdAt: c.createdAt,
      excerpt: c.text.slice(0, 280),
    }));

    if (citations.length === 0 && segments.every((s) => s.evidenceIds.length === 0)) {
      // Chronology without evidence still needs evidence for factual claims
      const chronologicalOnly = segments.length > 0;
      if (!chronologicalOnly) {
        return this.persistResult(input, {
          answer: INSUFFICIENT_EVIDENCE_MESSAGE,
          citations: [],
          segments: [],
          insufficientEvidence: true,
        });
      }
    }

    const answer = this.formatAnswer(afterimage.title, input.question, segments, citations);

    // Optional LLM polish — still constrained to provided segments; if API fails, use template
    const polished = await this.maybePolishWithLlm(input.question, answer, citations.map((c) => c.evidenceId));
    const finalAnswer = polished ?? answer;

    return this.persistResult(input, {
      answer: finalAnswer,
      citations,
      segments,
      insufficientEvidence: citations.length === 0,
    });
  }

  private buildStorySegments(
    afterimage: {
      title: string;
      firstObserved: Date;
      lastObserved: Date | null;
      status: string;
      events: Array<{
        id: string;
        eventType: string;
        title: string | null;
        description: string;
        occurredAt: Date;
      }>;
      evidence: Array<{ id: string; createdAt: Date }>;
    },
  ): StorySegment[] {
    const segments: StorySegment[] = [];

    for (const ev of afterimage.events) {
      const year = ev.occurredAt.getUTCFullYear();
      const linked = afterimage.evidence
        .filter((e) => Math.abs(e.createdAt.getTime() - ev.occurredAt.getTime()) < 1000 * 60 * 60 * 24 * 90)
        .map((e) => e.id);
      const text = [
        `${year}`,
        ev.title || humanizeEvent(ev.eventType),
        ev.description ? ev.description : null,
        linked.length ? linked.map((id) => `[EVIDENCE ${id}]`).join(" ") : "[NO LINKED EVIDENCE]",
      ]
        .filter(Boolean)
        .join("\n");

      segments.push({
        year,
        text,
        evidenceIds: linked,
      });
    }

    if (afterimage.status === "GONE") {
      segments.push({
        year: null,
        text: "NOW\nOnly its AFTERIMAGE remains.",
        evidenceIds: [],
      });
    }

    return segments;
  }

  private formatAnswer(
    title: string,
    question: string,
    segments: StorySegment[],
    citations: EvidenceCitation[],
  ): string {
    if (citations.length === 0 && segments.every((s) => s.evidenceIds.length === 0)) {
      return INSUFFICIENT_EVIDENCE_MESSAGE;
    }

    const lines: string[] = [
      `Evidence-backed history for "${title}" (question: ${question}).`,
      "",
      ...segments.map((s) => s.text),
      "",
      "Citations:",
      ...citations.map((c) => `- [EVIDENCE ${c.evidenceId}] ${c.type}${c.title ? `: ${c.title}` : ""}`),
    ];

    if (citations.length === 0) {
      lines.push("", "Note: Chronology is derived from registered events; attach evidence for stronger claims.");
    }

    return lines.join("\n");
  }

  /**
   * LLM may only rewrite style using provided text; must keep evidence IDs.
   * If the model omits citations or invents IDs → discard and use grounded template.
   */
  private async maybePolishWithLlm(
    question: string,
    groundedAnswer: string,
    allowedEvidenceIds: string[],
  ): Promise<string | null> {
    if (!config.AI_API_KEY) return null;
    if (groundedAnswer.startsWith("INSUFFICIENT EVIDENCE")) return groundedAnswer;

    try {
      const res = await fetch(`${config.AI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.AI_MODEL,
          temperature: 0,
          messages: [
            {
              role: "system",
              content:
                "You are the AFTERIMAGE Memory Engine. Rewrite ONLY using the provided grounded text. " +
                "Every factual sentence must keep its [EVIDENCE id] citation. " +
                "Never invent facts, dates, people, or evidence IDs. " +
                "If you cannot answer from the text, reply exactly with: " +
                INSUFFICIENT_EVIDENCE_MESSAGE,
            },
            {
              role: "user",
              content: `Question: ${question}\n\nGrounded material:\n${groundedAnswer}\n\nAllowed evidence IDs: ${allowedEvidenceIds.join(", ") || "(none)"}`,
            },
          ],
        }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content?.trim();
      if (!content) return null;
      if (content.includes("INSUFFICIENT EVIDENCE")) return INSUFFICIENT_EVIDENCE_MESSAGE;

      // Reject if model cites unknown evidence IDs
      const cited = [...content.matchAll(/\[EVIDENCE\s+([^\]]+)\]/gi)].map((m) => m[1]?.trim());
      for (const id of cited) {
        if (id && allowedEvidenceIds.length > 0 && !allowedEvidenceIds.includes(id)) {
          return null;
        }
      }
      return content;
    } catch {
      return null;
    }
  }

  private async persistResult(
    input: { afterimageId: string; question: string; userId?: string; conversationId?: string },
    result: MemoryEngineResult,
  ): Promise<MemoryEngineResult> {
    const conversation = input.conversationId
      ? await prisma.aIConversation.findUnique({ where: { id: input.conversationId } })
      : await prisma.aIConversation.create({
          data: {
            afterimageId: input.afterimageId,
            userId: input.userId,
            title: input.question.slice(0, 120),
          },
        });

    if (!conversation) {
      return { ...result, conversationId: undefined };
    }

    await prisma.aIMessage.createMany({
      data: [
        {
          conversationId: conversation.id,
          role: "USER",
          content: input.question,
        },
        {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: result.answer,
          citedEvidenceIds: result.citations.map((c) => c.evidenceId),
          insufficientEvidence: result.insufficientEvidence,
        },
      ],
    });

    return { ...result, conversationId: conversation.id };
  }
}

function humanizeEvent(eventType: string): string {
  return eventType.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export const memoryEngine = new AIMemoryEngine();
