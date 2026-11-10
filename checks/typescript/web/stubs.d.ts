// Helpers and components the web-platform samples call but don't define.
/// <reference types="astro/client" />
import type { ReactNode } from "react";

declare global {
    type Post = { id: string; title: string };
    function getPosts(): Promise<Post[]>;
    function PostList(props: { posts: Post[] }): ReactNode;
    function savePost(id: string): Promise<void>;
    function saveProfile(userId: string, name: string): Promise<void>;
    function markRead(id: string): Promise<void>;
    function ItemListSkeleton(): ReactNode;
    function ItemList(props: { items: { id: string; title: string; created_at: string }[] }): ReactNode;
}
