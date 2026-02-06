/**
 * Dataverse クライアントユーティリティ
 * 
 * Microsoft Power Apps SDK (@microsoft/power-apps) を使用して
 * Dataverse への接続およびデータ操作を行うためのラッパー関数を提供します。
 * 
 * 参考: https://learn.microsoft.com/ja-jp/power-apps/developer/code-apps/how-to/connect-to-dataverse
 */

import { getClient } from '@microsoft/power-apps/data';
import type { DataClient } from '@microsoft/power-apps/data';

/**
 * Dataverse テーブル定義の型
 */
export interface DataverseTableInfo {
  tableId: string;
  apis: Record<string, never>;
}

/**
 * Dataverse スキーマ定義
 * 複数のテーブルをまとめた定義
 */
export type DataverseSchema = Record<string, DataverseTableInfo>;

/**
 * クエリオプション
 */
export interface QueryOptions {
  select?: string[];
  filter?: string;
  orderBy?: string[];
  top?: number;
  expand?: string[];
}

/**
 * Dataverse クライアントラッパークラス
 * 
 * @microsoft/power-apps の getClient を使用した型安全な Dataverse 操作を提供
 */
export class DataverseClientWrapper {
  private client: DataClient;

  constructor(schema: DataverseSchema) {
    this.client = getClient(schema);
  }

  /**
   * 単一レコードを取得
   * 
   * @param tableName テーブルの論理名
   * @param id レコードID
   * @param options クエリオプション
   * @returns レコードデータ
   */
  async retrieveRecord<T>(
    tableName: string,
    id: string,
    options?: QueryOptions
  ): Promise<T> {
    const queryOptions = this.buildQueryOptions(options);
    const result = await this.client.retrieveRecordAsync<T>(tableName, id, queryOptions);
    if (!result.success) {
      throw result.error || new Error('レコードの取得に失敗しました');
    }
    return result.data;
  }

  /**
   * 複数レコードを取得
   * 
   * @param tableName テーブルの論理名
   * @param options クエリオプション
   * @returns レコードの配列
   */
  async retrieveMultipleRecords<T>(
    tableName: string,
    options?: QueryOptions
  ): Promise<T[]> {
    const queryOptions = this.buildQueryOptions(options);
    const result = await this.client.retrieveMultipleRecordsAsync<T>(tableName, queryOptions);
    if (!result.success) {
      throw result.error || new Error('レコードの取得に失敗しました');
    }
    return result.data;
  }

  /**
   * 新規レコードを作成
   * 
   * @param tableName テーブルの論理名
   * @param data レコードデータ
   * @returns 作成されたレコード
   */
  async createRecord<TInput, TOutput>(
    tableName: string,
    data: TInput
  ): Promise<TOutput> {
    const result = await this.client.createRecordAsync<TInput, TOutput>(tableName, data);
    if (!result.success) {
      throw result.error || new Error('レコードの作成に失敗しました');
    }
    return result.data;
  }

  /**
   * 既存レコードを更新
   * 
   * @param tableName テーブルの論理名
   * @param id レコードID
   * @param data 更新データ
   * @returns 更新されたレコード
   */
  async updateRecord<TInput, TOutput>(
    tableName: string,
    id: string,
    data: TInput
  ): Promise<TOutput> {
    const result = await this.client.updateRecordAsync<TInput, TOutput>(tableName, id, data);
    if (!result.success) {
      throw result.error || new Error('レコードの更新に失敗しました');
    }
    return result.data;
  }

  /**
   * レコードを削除
   * 
   * @param tableName テーブルの論理名
   * @param id レコードID
   */
  async deleteRecord(tableName: string, id: string): Promise<void> {
    const result = await this.client.deleteRecordAsync(tableName, id);
    if (!result.success) {
      throw result.error || new Error('レコードの削除に失敗しました');
    }
  }

  /**
   * クエリオプションを構築
   */
  private buildQueryOptions(options?: QueryOptions): { 
    select?: string[];
    filter?: string;
    orderBy?: string[];
    top?: number;
    skip?: number;
  } | undefined {
    if (!options) return undefined;

    return {
      select: options.select,
      filter: options.filter,
      orderBy: options.orderBy,
      top: options.top
    };
  }
}

/**
 * Dataverse クライアントを作成
 * 
 * @param schema テーブルスキーマ定義
 * @returns DataverseClientWrapper インスタンス
 * 
 * @example
 * ```typescript
 * const schema = {
 *   contacts: {
 *     tableId: "00000000-0000-0000-0000-000000000000",
 *     apis: {}
 *   }
 * };
 * 
 * const client = createDataverseClient(schema);
 * const contacts = await client.retrieveMultipleRecords('contacts', {
 *   select: ['fullname', 'emailaddress1'],
 *   top: 10
 * });
 * ```
 */
export function createDataverseClient(schema: DataverseSchema): DataverseClientWrapper {
  return new DataverseClientWrapper(schema);
}
