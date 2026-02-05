
export interface Entry {
  id: string;
  type: 'in' | 'out';
  dateTime: string;
  details: string;
  amount: number;
  category: string;
  mode: string;
  attachments: { id: string; name: string; data: string; type: string }[];
}

export interface Ledger {
  id: string;
  name: string;
  createdAt: number;
  entries: Entry[];
}

export type Theme = 'light' | 'dark';

export interface User {
  name: string;
  email: string;
  avatar: string;
}
