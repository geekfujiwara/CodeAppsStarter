/**
 * Dataverse 用 React フック
 * 
 * Dataverse データを React コンポーネントで簡単に扱うためのカスタムフックを提供します。
 * React Query と @microsoft/power-apps SDK を組み合わせて使用します。
 * 
 * 使用例:
 * ```typescript
 * const { data, isLoading, error } = useDataverseRecords('contacts', {
 *   select: ['fullname', 'emailaddress1'],
 *   top: 10
 * });
 * ```
 * 
 * 注意: クライアントインスタンスは React Context で提供することを推奨します。
 * 現在の実装はシンプルな例として提供されています。
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { createDataverseClient, type DataverseSchema, type QueryOptions } from '@/lib/dataverse-client';

/**
 * Dataverse クライアントのシングルトンインスタンス
 * 
 * 注: 実際のアプリケーションでは、以下のような方法での提供を推奨します:
 * - React Context API を使用した Provider パターン
 * - 依存性注入 (DI) パターン
 * - アプリケーション初期化時の設定
 */
let clientInstance: ReturnType<typeof createDataverseClient> | null = null;

/**
 * Dataverse クライアントを初期化
 * 
 * @param schema Dataverse スキーマ定義
 */
export function initializeDataverseClient(schema: DataverseSchema): void {
  clientInstance = createDataverseClient(schema);
}

/**
 * Dataverse クライアントを取得
 */
function getDataverseClient() {
  if (!clientInstance) {
    throw new Error(
      'Dataverse クライアントが初期化されていません。initializeDataverseClient() を呼び出してください。'
    );
  }
  return clientInstance;
}

/**
 * 複数レコードを取得するフック
 * 
 * @param tableName テーブルの論理名
 * @param options クエリオプション
 * @param enabled クエリを有効にするかどうか（デフォルト: true）
 * @returns React Query の結果
 * 
 * @example
 * ```typescript
 * function ContactList() {
 *   const { data: contacts, isLoading } = useDataverseRecords<Contact>('contacts', {
 *     select: ['fullname', 'emailaddress1'],
 *     orderBy: ['fullname'],
 *     top: 50
 *   });
 * 
 *   if (isLoading) return <div>読み込み中...</div>;
 *   return <div>{contacts?.map(c => c.fullname)}</div>;
 * }
 * ```
 */
export function useDataverseRecords<T>(
  tableName: string,
  options?: QueryOptions,
  enabled = true
): UseQueryResult<T[], Error> {
  return useQuery<T[], Error>({
    queryKey: ['dataverse', tableName, 'list', options],
    queryFn: async () => {
      const client = getDataverseClient();
      return await client.retrieveMultipleRecords<T>(tableName, options);
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
    gcTime: 10 * 60 * 1000 // 10分間キャッシュを保持
  });
}

/**
 * 単一レコードを取得するフック
 * 
 * @param tableName テーブルの論理名
 * @param id レコードID
 * @param options クエリオプション
 * @param enabled クエリを有効にするかどうか（デフォルト: true）
 * @returns React Query の結果
 * 
 * @example
 * ```typescript
 * function ContactDetail({ contactId }: { contactId: string }) {
 *   const { data: contact, isLoading } = useDataverseRecord<Contact>(
 *     'contacts',
 *     contactId,
 *     { select: ['fullname', 'emailaddress1', 'telephone1'] }
 *   );
 * 
 *   if (isLoading) return <div>読み込み中...</div>;
 *   return <div>{contact?.fullname}</div>;
 * }
 * ```
 */
export function useDataverseRecord<T>(
  tableName: string,
  id: string,
  options?: QueryOptions,
  enabled = true
): UseQueryResult<T, Error> {
  return useQuery<T, Error>({
    queryKey: ['dataverse', tableName, 'detail', id, options],
    queryFn: async () => {
      const client = getDataverseClient();
      return await client.retrieveRecord<T>(tableName, id, options);
    },
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });
}

/**
 * レコード作成用ミューテーション
 * 
 * @param tableName テーブルの論理名
 * @returns React Query のミューテーション結果
 * 
 * @example
 * ```typescript
 * function CreateContactForm() {
 *   const createContact = useDataverseCreate<ContactInput, Contact>('contacts');
 * 
 *   const handleSubmit = async (data: ContactInput) => {
 *     try {
 *       const newContact = await createContact.mutateAsync(data);
 *       console.log('作成成功:', newContact);
 *     } catch (error) {
 *       console.error('作成失敗:', error);
 *     }
 *   };
 * 
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useDataverseCreate<TInput, TOutput>(
  tableName: string
): UseMutationResult<TOutput, Error, TInput> {
  const queryClient = useQueryClient();

  return useMutation<TOutput, Error, TInput>({
    mutationFn: async (data: TInput) => {
      const client = getDataverseClient();
      return await client.createRecord<TInput, TOutput>(tableName, data);
    },
    onSuccess: () => {
      // レコード一覧のキャッシュを無効化して再取得をトリガー
      queryClient.invalidateQueries({ queryKey: ['dataverse', tableName, 'list'] });
    }
  });
}

/**
 * レコード更新用ミューテーション
 * 
 * @param tableName テーブルの論理名
 * @returns React Query のミューテーション結果
 * 
 * @example
 * ```typescript
 * function UpdateContactForm({ contactId }: { contactId: string }) {
 *   const updateContact = useDataverseUpdate<ContactInput, Contact>('contacts');
 * 
 *   const handleSubmit = async (data: ContactInput) => {
 *     try {
 *       const updated = await updateContact.mutateAsync({ id: contactId, data });
 *       console.log('更新成功:', updated);
 *     } catch (error) {
 *       console.error('更新失敗:', error);
 *     }
 *   };
 * 
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useDataverseUpdate<TInput, TOutput>(
  tableName: string
): UseMutationResult<TOutput, Error, { id: string; data: TInput }> {
  const queryClient = useQueryClient();

  return useMutation<TOutput, Error, { id: string; data: TInput }>({
    mutationFn: async ({ id, data }) => {
      const client = getDataverseClient();
      return await client.updateRecord<TInput, TOutput>(tableName, id, data);
    },
    onSuccess: (_, variables) => {
      // 該当レコードと一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['dataverse', tableName, 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dataverse', tableName, 'list'] });
    }
  });
}

/**
 * レコード削除用ミューテーション
 * 
 * @param tableName テーブルの論理名
 * @returns React Query のミューテーション結果
 * 
 * @example
 * ```typescript
 * function DeleteContactButton({ contactId }: { contactId: string }) {
 *   const deleteContact = useDataverseDelete('contacts');
 * 
 *   const handleDelete = async () => {
 *     if (confirm('本当に削除しますか？')) {
 *       try {
 *         await deleteContact.mutateAsync(contactId);
 *         console.log('削除成功');
 *       } catch (error) {
 *         console.error('削除失敗:', error);
 *       }
 *     }
 *   };
 * 
 *   return <button onClick={handleDelete}>削除</button>;
 * }
 * ```
 */
export function useDataverseDelete(
  tableName: string
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const client = getDataverseClient();
      await client.deleteRecord(tableName, id);
    },
    onSuccess: (_, id) => {
      // 該当レコードと一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['dataverse', tableName, 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['dataverse', tableName, 'list'] });
    }
  });
}
