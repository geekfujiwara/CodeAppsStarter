#!/usr/bin/env node

/**
 * Dataverse CLI ツール
 * 
 * コマンドラインから Dataverse への接続テストやメタデータ取得を実行するためのツールです。
 * 
 * 使用方法:
 *   npm run dataverse:help              - ヘルプを表示
 *   npm run dataverse:test              - 接続テストを実行
 *   npm run dataverse:metadata <table>  - テーブルメタデータを取得
 *   npm run dataverse:guide <table>     - pac CLI 使用ガイドを表示
 * 
 * 前提条件:
 *   - Power Apps 環境に pac CLI で接続済みであること
 *   - power.config.json が正しく設定されていること
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  SAMPLE_TABLE_SCHEMAS,
  PacCommandHelper
} from '../src/lib/dataverse-metadata';

// コマンドライン引数を取得
const args = process.argv.slice(2);
const command = args[0] || 'help';
const param = args[1];

// プロジェクトルートのパス
const PROJECT_ROOT = resolve(process.cwd());
const POWER_CONFIG_PATH = resolve(PROJECT_ROOT, 'power.config.json');

/**
 * power.config.json を読み込み
 */
function loadPowerConfig(): { environmentId?: string } | null {
  if (!existsSync(POWER_CONFIG_PATH)) {
    console.error('❌ power.config.json が見つかりません');
    console.log('\n💡 ヒント: pac code init コマンドで初期化してください');
    return null;
  }

  try {
    const content = readFileSync(POWER_CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ power.config.json の読み込みに失敗しました:', error);
    return null;
  }
}

/**
 * ヘルプを表示
 */
function showHelp(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           Dataverse CLI ツール - ヘルプ                        ║
╚════════════════════════════════════════════════════════════════╝

このツールは Dataverse への接続とメタデータ取得をサポートします。

📋 使用可能なコマンド:

  help                      このヘルプを表示
  test                      Dataverse 接続設定をテスト
  metadata <table>          テーブルメタデータ情報を表示
  guide <table>             pac CLI 使用ガイドを表示
  list                      サンプルテーブル一覧を表示
  commands <table>          pac CLI コマンドを生成

💡 使用例:

  node scripts/dataverse-cli.js help
  node scripts/dataverse-cli.js test
  node scripts/dataverse-cli.js metadata account
  node scripts/dataverse-cli.js guide contact
  node scripts/dataverse-cli.js list
  node scripts/dataverse-cli.js commands account

📚 詳細なドキュメント:
  docs/dataverse-design.md を参照してください

🔗 Microsoft Learn リファレンス:
  - Dataverse 接続: https://learn.microsoft.com/ja-jp/power-apps/developer/code-apps/how-to/connect-to-dataverse
  - メタデータ取得: https://learn.microsoft.com/ja-jp/power-apps/developer/code-apps/how-to/get-table-metadata
`);
}

/**
 * 接続テストを実行
 */
function testConnection(): void {
  console.log('🔍 Dataverse 接続設定をテストしています...\n');

  const config = loadPowerConfig();
  if (!config) {
    return;
  }

  console.log('✅ power.config.json が見つかりました');

  if (config.environmentId) {
    console.log(`✅ 環境ID: ${config.environmentId}`);
    console.log('\n💡 接続準備が完了しています！');
    console.log('   pac code add-data-source コマンドでテーブルを追加できます\n');
  } else {
    console.log('⚠️  環境ID が設定されていません');
    console.log('\n💡 ヒント:');
    console.log('   1. pac auth create で Power Platform に接続');
    console.log('   2. pac code init で環境を初期化\n');
  }
}

/**
 * テーブルメタデータを表示
 */
function showTableMetadata(tableName: string): void {
  if (!tableName) {
    console.error('❌ テーブル名を指定してください');
    console.log('   例: node scripts/dataverse-cli.js metadata account\n');
    return;
  }

  console.log(`📊 テーブルメタデータ: ${tableName}\n`);

  const schema = SAMPLE_TABLE_SCHEMAS.find(s => s.logicalName === tableName);
  if (schema) {
    console.log('テーブル情報:');
    console.log(`  論理名: ${schema.logicalName}`);
    console.log(`  表示名: ${schema.displayName}`);
    console.log(`  説明: ${schema.description || '(なし)'}`);
    console.log(`  テーブルID: ${schema.tableId}\n`);

    console.log('💡 このテーブルを使用するには:');
    console.log(`   ${PacCommandHelper.generateAddDataSourceCommand(tableName)}\n`);
  } else {
    console.log(`⚠️  サンプルスキーマに ${tableName} が見つかりません`);
    console.log('   カスタムテーブルの場合は pac CLI で直接追加してください\n');
  }
}

/**
 * pac CLI 使用ガイドを表示
 */
function showGuide(tableName: string): void {
  if (!tableName) {
    console.error('❌ テーブル名を指定してください');
    console.log('   例: node scripts/dataverse-cli.js guide account\n');
    return;
  }

  console.log(PacCommandHelper.generateCommandGuide(tableName));
}

/**
 * サンプルテーブル一覧を表示
 */
function listSampleTables(): void {
  console.log('📋 利用可能なサンプルテーブル:\n');

  SAMPLE_TABLE_SCHEMAS.forEach(schema => {
    console.log(`  • ${schema.logicalName}`);
    console.log(`    ${schema.displayName} - ${schema.description || '標準テーブル'}\n`);
  });

  console.log('💡 カスタムテーブルも pac CLI で追加できます\n');
}

/**
 * pac CLI コマンドを生成
 */
function generateCommands(tableName: string): void {
  if (!tableName) {
    console.error('❌ テーブル名を指定してください');
    console.log('   例: node scripts/dataverse-cli.js commands account\n');
    return;
  }

  console.log(`\n📝 ${tableName} テーブル用の pac CLI コマンド:\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('# データソースとして追加');
  console.log(PacCommandHelper.generateAddDataSourceCommand(tableName));
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('このコマンドを実行すると、generated ディレクトリにファイルが生成されます。');
  console.log('具体的なファイル名は pac CLI の実装に依存します。\n');
}

/**
 * メイン処理
 */
function main(): void {
  switch (command) {
    case 'help':
      showHelp();
      break;
    case 'test':
      testConnection();
      break;
    case 'metadata':
      showTableMetadata(param);
      break;
    case 'guide':
      showGuide(param);
      break;
    case 'list':
      listSampleTables();
      break;
    case 'commands':
      generateCommands(param);
      break;
    default:
      console.error(`❌ 不明なコマンド: ${command}`);
      console.log('   "help" コマンドでヘルプを表示します\n');
      showHelp();
      break;
  }
}

// 実行
main();
