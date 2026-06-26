export type Highlight = {
  id: string;
  title: string;
  image?: string;
  isNew?: boolean;
};

export const highlights: Highlight[] = [
  {
    id: 'new',
    title: 'New',
    isNew: true,
  },
  {
    id: '1',
    title: 'P',
    image: 'https://dummyimage.com/200x200/000/ffffff&text=P',
  },
  {
    id: '2',