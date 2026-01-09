// Shared types for FlowStack

export interface FlowStackConfig {
  name: string;
  version: string;
}

export interface ApiResponse<T> {
  data: T;
  error: string | null;
  status: number;
}
