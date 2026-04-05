export type ToolCategory = "read" | "write";

export interface ToolMeta {
  name: string;
  description: string;
  category: ToolCategory;
}
