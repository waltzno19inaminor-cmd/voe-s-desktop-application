export interface Era {
  id: string;
  label: string;
}

export interface Person {
  id: string;
  name: string;
  era: string;
  eraLabel: string;
  image?: string;
  description: string;
  tags: string[];
}
