# ブログ

## 概要

静的ファイルのみで構成されるブログ。記事は Markdown で管理し、ビルドステップなしでブラウザが実行時にレンダリングする。依存を最小化することを基本方針とする。

---

## 基本方針

- **ライブラリ・フレームワークに依存しない**
- **ランタイム（Node.js 等）に依存しない**
- **ビルドステップを持たない**（デプロイ＝静的ファイルのアップロードのみ）
- **ブラウザの JS + Web API だけで完結する**
- 依存するものは「Web 標準」に一本化する

---

## ローカル開発

```bash
cd v2
python3 -m http.server 8080
# → http://localhost:8080
```

---

## 記事管理

- 記事は `.md` ファイルで管理
- メタデータ（タイトル・日付・タグ）は `posts/index.json` で一元管理
- 新規記事追加時は `index.json` に1行追加し `.md` ファイルを作成する

```json
[
  { "slug": "my-post", "path": "posts/my-post.md", "title": "タイトル", "date": "2024-01-01", "tags": ["技術"] }
]
```

---

## 技術構成

### モジュール解決

- **Import Maps** を使用（バンドラー不使用）
- `index.html` の `<script type="importmap">` で bare specifier を解決する

```html
<script type="importmap">
{
  "imports": {
    "markdown": "./src/markdown/index.js"
  }
}
</script>
```

### ルーティング

- `/#slug` でハッシュルーティング
- v1 の URL（`/slug`）との後方互換は `_redirects` で対応

### スレッド設計

| スレッド | 役割 |
|---|---|
| メインスレッド | DOM 操作・レンダリング・ルーティング |
| Service Worker | fetch インターセプト・キャッシュ管理 |

### Service Worker（キャッシュ戦略）

| リソース | 戦略 |
|---|---|
| `*.md` | キャッシュ優先（オフライン対応） |
| その他静的ファイル | キャッシュ優先（GET のみキャッシュ） |

---

## 設計ルール

### ブラウザグローバルの集約（`src/platform.js`）

`document`・`localStorage`・`window` などのブラウザグローバルには **`src/platform.js` 経由でのみアクセスする**。

```js
// ✅ 正しい
import { platform } from '../platform.js'
platform.document.querySelector('main')

// ❌ 禁止
document.querySelector('main')
```

### 外部 import の禁止

`src/` 内では相対パス・import map エイリアス・絶対パスのみ import できる。npm パッケージ・Node.js 組み込みモジュールは禁止。

### `eval` の禁止

動的コード実行（`eval()`・`new Function()`）は禁止。

### リンタによる自動検出

| ルール | 検出内容 |
|---|---|
| `no-global-access` | `platform.js` 以外でのグローバルアクセス |
| `no-external-imports` | 外部モジュールの import |
| `no-eval` | `eval`・`new Function` の使用 |

---

## セキュリティ

- XSS: Markdown・JSON の全フィールドを HTML エスケープ
- URL 検証: リンク・画像の URL からプロトコルベースの注入をブロック
- セキュリティヘッダー: CSP・HSTS・X-Frame-Options 等を Function のレスポンスに付与
- SW: キャッシュ書き込みは GET リクエストのみ

---

## 意思決定ログ

| 検討事項 | 採用しなかった選択肢 | 理由 |
|---|---|---|
| Markdown パーサー | `marked` 等のライブラリ | ライブラリ依存排除の方針 |
| SSG | Hugo / Zola / Jekyll | ビルドステップを持ちたくない |
| ビルドスクリプト | Node.js + Makefile | ランタイム依存を排除 |
| モジュール解決 | webpack / vite | バンドラー不要の方針 |
| ベイズ最適化ライブラリ | 各種 stats ライブラリ | ライブラリ依存排除の方針 |
| ホスティング | GitHub Pages | カスタムヘッダー設定・DDoS 保護の観点で Cloudflare Pages が優位 |
| ルーティング | パスベース | ローカル開発でサーバー不要なハッシュルーティングを採用 |

---

## 参考資料

- https://zenn.dev/akatsuki/articles/a2cbd26488fa151b828b
- [SDK 設計ドキュメント（SDK.md）](./SDK.md)
