# Power Apps Code Apps 開発テンプレート

**Vite + TypeScript + React** を使用した Power Apps コードアプリ開発用のモダンなスターターテンプレートです。

Microsoft Learn Catalog API データをサンプルとして活用し、ダッシュボード、フォーム、ギャラリー、フィルター、カード表示などの実装パターンを紹介します。

---

##  主な特徴

- **モダンなツール** - Vite、TypeScript、React を採用
- **すぐに使えるスタイリング** - Tailwind CSS、shadcn/ui コンポーネント、テーマ機能を標準装備
- **サンプル実装** - Learn API データを活用したギャラリー、フォーム、フィルター、カード表示の実装例
- **API 連携パターン** - React Query を使用したデータフェッチとキャッシングの実装例
- **標準パターン** - 業界標準のパターンとベストプラクティス
- **AI エージェントフレンドリー** - コーディングエージェントでの使用に最適化
- **日本語UI** - 日本語でのユーザーインターフェース
- **レスポンシブデザイン** - モバイル対応のサイドバーナビゲーション
- **使い方ガイド** - GitHub Copilot との連携方法を含む詳細なガイド

---

## サンプル実装

このテンプレートには、Microsoft Learn Catalog API を活用した以下のサンプル実装が含まれています:

### 🎨 ギャラリー&フィルター実装

- 検索機能付きアイテムギャラリー
- 複数条件フィルタリング (ロール、プロダクト、レベル)
- ページネーション
- レスポンシブグリッドレイアウト

### 📝 フォーム実装

- モーダルベースのフォーム
- API データを活用した動的フォームフィールド
- バリデーションとエラーハンドリング

### 📊 ダッシュボード実装

- 統計カード表示
- データの集計と可視化
- カードベースのレイアウト

### 🎴 カード表示実装

- Learn データを活用したカードコンポーネント
- バッジとメタデータ表示
- 外部リンク確認モーダル

---

## プリインストールライブラリ

- [Tailwind CSS](https://tailwindcss.com/) - ユーティリティファーストCSS フレームワーク
- [shadcn/ui](https://ui.shadcn.com/) - プリインストールされたUIコンポーネント
- [Lucide](https://lucide.dev/) - 美しく一貫性のあるアイコン
- [React Router](https://reactrouter.com/) - ページ、ルーティング
- [Tanstack Query](https://tanstack.com/query/docs) - データフェッチ、状態管理
- [Tanstack Table](https://tanstack.com/table/docs) - インタラクティブなテーブル、データグリッド
- [sonner](https://sonner.emilkowal.ski/) - トースト通知

---

## クイックスタート

### 前提条件

- Node.js (最新LTS版推奨)
- Git
- VS Code (推奨)
- GitHub Copilot 拡張機能 (推奨)

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/geekfujiwara/CodeAppsStarter.git
cd CodeAppsStarter

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:5173` を開いて確認してください。

---

## テンプレートの使い方

このテンプレートには、GitHub Copilot を活用した効率的な開発方法を説明する詳細なガイドページが含まれています。

アプリを起動後、「このテンプレートの使い方」ページにアクセスして、以下の情報を確認できます:

1. **開発環境のセットアップ** - 必要なツールとセットアップコマンド
2. **Power Apps へのデプロイ準備** - `pac code init` コマンドの使い方
3. **開発標準の活用方法** - GitHub Copilot との連携方法

詳細な開発標準については、[CodeAppsDevelopmentStandard](https://github.com/geekfujiwara/CodeAppsDevelopmentStandard) リポジトリを参照してください。

---

## 機能

### 実装済みの機能

- **サンプル実装** - Learn API を活用したギャラリー、フォーム、フィルター、カード表示の実装例
- **API 連携** - React Query を使用したデータフェッチとキャッシング
- **ダークモード対応** - システム設定に合わせた自動切り替え
- **レスポンシブデザイン** - モバイル、タブレット、デスクトップに対応
- **サイドバーナビゲーション** - コラップス可能なナビゲーション
- **リンク確認モーダル** - 外部リンクを開く前の確認ダイアログ
- **使い方ガイド** - GitHub Copilot 連携ガイドとURL コピー機能
- **日本語ローカライゼーション** - 完全な日本語UI

### ダッシュボード

- 統計カードによるデータ可視化
- 人気モジュールのハイライト表示
- フォーム実装サンプル
- カード表示サンプル

### フッター

以下のソーシャルリンクを含むフッター:

- X (Twitter): [@geekfujiwara](https://x.com/geekfujiwara)
- YouTube: [Geek Fujiwara チャンネル](https://www.youtube.com/@geekfujiwara)
- Udemy: [コース一覧](https://www.udemy.com/user/gikuhuziwarateng-yuan-hong-dao/)
- ブログ: [geekfujiwara.com](https://www.geekfujiwara.com/)

---

## Power Apps へのデプロイ

```bash
# Power Apps 環境にアプリを初期化
pac code init --environment <環境ID> --displayname <アプリ名>

# ビルド
npm run build

# Power Apps にデプロイ
pac code push
```

---

## プロジェクト構造

```text
CodeAppsStarter/
├── public/              # 静的アセット
│   ├── geekkumanomi.svg # Geek アイコン
│   └── power-apps.svg   # Power Apps ロゴ
├── src/
│   ├── components/      # 再利用可能なコンポーネント
│   │   ├── ui/          # shadcn/ui コンポーネント
│   │   ├── sidebar.tsx
│   │   ├── sidebar-layout.tsx
│   │   ├── form-modal.tsx
│   │   ├── link-confirm-modal.tsx
│   │   ├── learn-module-form.tsx
│   │   └── mode-toggle.tsx
│   ├── pages/           # ページコンポーネント
│   │   ├── _layout.tsx  # レイアウトとヘッダー/フッター
│   │   ├── home.tsx     # ダッシュボード
│   │   ├── learn.tsx    # ギャラリー&フィルター実装
│   │   ├── guide.tsx    # テンプレートの使い方ガイド
│   │   └── not-found.tsx
│   ├── hooks/           # カスタムフック
│   │   ├── use-learn-catalog.ts
│   │   └── use-theme.ts
│   ├── lib/             # ユーティリティ関数
│   │   ├── learn-client.ts
│   │   └── utils.ts
│   ├── providers/       # コンテキストプロバイダー
│   └── router.tsx       # ルーティング設定
├── package.json
└── vite.config.ts
```

---

## コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容について議論してください。

---

## ライセンス

MIT License

---

## 作成者

### Geek Fujiwara

- X: [@geekfujiwara](https://x.com/geekfujiwara)
- YouTube: [Geek Fujiwara チャンネル](https://www.youtube.com/@geekfujiwara)
- Udemy: [コース一覧](https://www.udemy.com/user/gikuhuziwarateng-yuan-hong-dao/)
- ブログ: [geekfujiwara.com](https://www.geekfujiwara.com/)

---

## 謝辞

このテンプレートは、Microsoft の [Power Apps Code Apps](https://github.com/microsoft/PowerAppsCodeApps) プロジェクトをベースに、日本語環境と開発標準を統合したものです。
