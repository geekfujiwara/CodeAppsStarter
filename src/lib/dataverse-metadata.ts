/**
 * Dataverse メタデータユーティリティ
 * 
 * Dataverse のテーブルメタデータを取得・管理するための機能を提供します。
 * 
 * 参考: https://learn.microsoft.com/ja-jp/power-apps/developer/code-apps/how-to/get-table-metadata
 */

import type { DataverseClientWrapper } from './dataverse-client';

/**
 * テーブルメタデータ
 */
export interface TableMetadata {
  logicalName: string;
  displayName: string;
  description?: string;
  primaryIdAttribute: string;
  primaryNameAttribute?: string;
  attributes: AttributeMetadata[];
  isCustomEntity: boolean;
}

/**
 * 属性（カラム）メタデータ
 */
export interface AttributeMetadata {
  logicalName: string;
  displayName: string;
  description?: string;
  attributeType: AttributeType;
  isPrimaryId: boolean;
  isPrimaryName: boolean;
  isRequired: boolean;
  isReadOnly: boolean;
  maxLength?: number;
  options?: OptionMetadata[];
}

/**
 * 属性タイプ
 */
export type AttributeType =
  | 'String'
  | 'Integer'
  | 'Decimal'
  | 'Double'
  | 'DateTime'
  | 'Boolean'
  | 'Lookup'
  | 'Picklist'
  | 'Money'
  | 'Memo'
  | 'UniqueIdentifier'
  | 'Virtual'
  | 'Owner'
  | 'Customer';

/**
 * 選択肢メタデータ（Picklist 用）
 */
export interface OptionMetadata {
  value: number;
  label: string;
}

/**
 * メタデータキャッシュ
 */
const metadataCache = new Map<string, TableMetadata>();

/**
 * テーブルメタデータを取得
 * 
 * 注: 現在の @microsoft/power-apps SDK ではメタデータ取得のための
 * 直接的な API が提供されていないため、この関数は将来の実装に備えた
 * プレースホルダーとなっています。
 * 
 * 実際の実装では、以下のいずれかの方法を使用します:
 * 1. pac code add-data-source コマンドで生成されたモデル定義を使用
 * 2. Dataverse Web API を直接呼び出してメタデータを取得
 * 3. カスタムアクション/関数を通じてメタデータを取得
 * 
 * @param _client Dataverse クライアント (現在は未使用)
 * @param tableName テーブルの論理名
 * @returns テーブルメタデータ
 */
export async function getTableMetadata(
  _client: DataverseClientWrapper,
  tableName: string
): Promise<TableMetadata> {
  // キャッシュをチェック
  const cached = metadataCache.get(tableName);
  if (cached) {
    return cached;
  }

  // 注: 実際のメタデータ取得は pac CLI または Dataverse Web API を使用
  // ここでは基本的な構造を返すプレースホルダー
  // カスタムテーブルは通常 'new_' や組織の発行者プレフィックスで始まる
  const metadata: TableMetadata = {
    logicalName: tableName,
    displayName: tableName,
    description: `${tableName} テーブル`,
    primaryIdAttribute: `${tableName}id`,
    isCustomEntity: tableName.includes('_'), // プレフィックス付きはカスタムテーブルの可能性が高い
    attributes: []
  };

  // キャッシュに保存
  metadataCache.set(tableName, metadata);

  return metadata;
}

/**
 * 複数のテーブルメタデータを取得
 * 
 * @param client Dataverse クライアント
 * @param tableNames テーブル名の配列
 * @returns テーブルメタデータの配列
 */
export async function getMultipleTableMetadata(
  client: DataverseClientWrapper,
  tableNames: string[]
): Promise<TableMetadata[]> {
  const promises = tableNames.map(name => getTableMetadata(client, name));
  return await Promise.all(promises);
}

/**
 * メタデータキャッシュをクリア
 */
export function clearMetadataCache(): void {
  metadataCache.clear();
}

/**
 * テーブルスキーマ情報
 * pac CLI で使用されるスキーマ定義のサンプル
 */
export interface TableSchemaInfo {
  logicalName: string;
  tableId: string;
  displayName: string;
  description?: string;
}

/**
 * サンプルテーブルスキーマ定義
 * 実際の開発では pac code add-data-source コマンドで生成されます
 */
export const SAMPLE_TABLE_SCHEMAS: TableSchemaInfo[] = [
  {
    logicalName: 'account',
    tableId: '00000000-0000-0000-0000-000000000001',
    displayName: '取引先企業',
    description: 'Dataverse の標準取引先企業テーブル'
  },
  {
    logicalName: 'contact',
    tableId: '00000000-0000-0000-0000-000000000002',
    displayName: '取引先担当者',
    description: 'Dataverse の標準取引先担当者テーブル'
  }
];

/**
 * テーブルスキーマ情報から Dataverse スキーマを生成
 * 
 * @param schemas テーブルスキーマ情報の配列
 * @returns Dataverse スキーマオブジェクト
 * 
 * @example
 * ```typescript
 * const schema = buildDataverseSchema([
 *   { logicalName: 'contact', tableId: 'guid', displayName: '取引先担当者' }
 * ]);
 * ```
 */
export function buildDataverseSchema(
  schemas: TableSchemaInfo[]
): Record<string, { tableId: string; apis: Record<string, never> }> {
  const result: Record<string, { tableId: string; apis: Record<string, never> }> = {};

  for (const schema of schemas) {
    result[schema.logicalName] = {
      tableId: schema.tableId,
      apis: {}
    };
  }

  return result;
}

/**
 * pac CLI コマンドヘルパー
 * 
 * Dataverse テーブルをデータソースとして追加するための
 * pac CLI コマンドを生成します
 */
export class PacCommandHelper {
  /**
   * データソース追加コマンドを生成
   * 
   * @param tableName テーブルの論理名
   * @returns pac CLI コマンド文字列
   */
  static generateAddDataSourceCommand(tableName: string): string {
    return `pac code add-data-source -a dataverse -t ${tableName}`;
  }

  /**
   * 複数のデータソース追加コマンドを生成
   * 
   * @param tableNames テーブル名の配列
   * @returns pac CLI コマンド文字列の配列
   */
  static generateMultipleAddDataSourceCommands(tableNames: string[]): string[] {
    return tableNames.map(name => this.generateAddDataSourceCommand(name));
  }

  /**
   * コマンド実行のガイド文を生成
   * 
   * @param tableName テーブルの論理名
   * @returns ガイド文字列
   */
  static generateCommandGuide(tableName: string): string {
    return `
Dataverse テーブル「${tableName}」をデータソースとして追加するには:

1. Power Platform 環境に接続:
   pac auth create

2. データソースを追加:
   ${this.generateAddDataSourceCommand(tableName)}

3. 生成されたファイルを確認:
   generated ディレクトリ内にモデルとサービスファイルが作成されます
   (具体的なファイル名は pac CLI の実装に依存します)

4. アプリケーションで使用:
   生成されたサービスをインポートして使用します
`;
  }
}
