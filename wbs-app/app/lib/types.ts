export interface Project {
  project_info: ProjectInfo;
  wbs: WBSTask[];
}

export interface ProjectInfo {
  name: string;
  version: string;
  pmbok_version: string;
  description: string;
  created_at?: string;  // オプショナル
  updated_at?: string;  // オプショナル
}

export interface WBSTask {
  id: string;                    // 一意のタスクID (例: "T-001")
  wbs_code: string;              // WBS階層コード (例: "1.2.3")
  name: string;                  // タスク名
  description?: string;          // タスク説明（オプション）
  priority: "Must" | "Should" | "Could" | "Won't";  // MoSCoW優先度
  start: string;                 // 開始日 (YYYY-MM-DD)
  duration_days: number;         // 期間（日数）
  end?: string;                  // 終了日（自動計算）
  progress?: number;             // 進捗率 (0-100) - オプショナル、デフォルト: 0
  assignee?: string;             // 担当者名
  dependencies?: string[];       // 前提タスクID配列（predecessorsから統一）
  buffer?: number;               // バッファ日数
  status?: "Not Started" | "In Progress" | "Completed" | "Delayed";  // オプショナル、デフォルト: "Not Started"
  children?: WBSTask[];          // 子タスク
  is_critical?: boolean;         // クリティカルパスフラグ
  notes?: string;                // メモ
} 