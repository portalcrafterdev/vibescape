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
    title: 'O',
    image: 'https://dummyimage.com/200x200/000/ffffff&text=O',
  },
  {
    id: '3',
    title: 'R',
    image: 'https://dummyimage.com/200x200/000/ffffff&text=R',
  },
  {
    id: '4',
    title: 'T',
    image: 'https://dummyimage.com/200x200/000/ffffff&text=T',
  },
  {
    id: '5',
    title: 'A',
    image: 'https://dummyimage.com/200x200/000/ffffff&text=A',
  },
  {
    id: '6',