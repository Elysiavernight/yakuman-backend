export interface User {
  id: string;
  username: string;
  name: string;
  bio: string;
  pronouns: string;
  avatar: string;
  createdAt: string;
  demo: boolean;
}

export interface Post {
  id: string;
  userId: string;
  user: User;
  types: string[];
  hand: string[];
  description: string;
  gameLink: string;
  image: string;
  platform: string;
  createdAt: string;
}
