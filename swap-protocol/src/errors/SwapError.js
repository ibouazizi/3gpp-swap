export class SwapError extends Error {
  constructor(problem) {
    super(problem?.detail || problem?.title || 'SWAP Error');
    this.name = 'SwapError';
    this.type = problem?.type;
    this.title = problem?.title;
    this.status = problem?.status;
    this.problem = problem || null;
  }
}

