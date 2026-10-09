export interface Suggestion {
  id: string;
  name: string | null;
  category: string | null;
  text: string;
  createdAt: string;
  status: string;
  isDrafted: boolean;
}

export interface CouncilQuestion {
  id: string;
  title: string;
  date: string;
  category: string;
  questionText: string;
  answerText: string | null;
  aiSummary: string | null;
  status: string;
  askedBy: string;
}

export interface Newsletter {
  id: string;
  title: string;
  excerpt: string | null;
  contentHtml: string;
  category: string | null;
  status: string;
  resendBroadcastId: string | null;
  publishDate: string | null;
  createdAt: string;
}
