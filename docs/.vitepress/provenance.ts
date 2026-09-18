interface MarkdownToken {
  content: string;
  type: string;
}

interface MarkdownState {
  tokens: MarkdownToken[];
}

const provenancePattern =
  /^Created\/edited by GitHub Copilot(?:; pending human review| with human review\/feedback by [A-Za-z][A-Za-z .'-]*)\.$/u;

export function removeLeadingProvenanceBlock(state: MarkdownState): void {
  const [quoteOpen, paragraphOpen, inline, paragraphClose, quoteClose] =
    state.tokens;
  if (
    quoteOpen?.type !== "blockquote_open" ||
    paragraphOpen?.type !== "paragraph_open" ||
    inline?.type !== "inline" ||
    paragraphClose?.type !== "paragraph_close" ||
    quoteClose?.type !== "blockquote_close" ||
    !provenancePattern.test(inline.content.trim())
  ) {
    return;
  }

  state.tokens.splice(0, 5);
}
