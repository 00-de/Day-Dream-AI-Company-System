# DayDream AI Company System v1.1.0

社長1人 ＋ AI社員23人による、次世代型AIエンターテインメント会社の統合ダッシュボードです。

- **フェーズ1**：2画面のUI（完了）
- **フェーズ2**：Firebase Auth（社長ログイン）＋ Firestore 連携 ← いまここ

---

## フェーズ2でできるようになったこと

1. **社長ログイン** … メールアドレスとパスワードでログインします
2. **見るだけモード** … Firebase未設定でも全画面を確認できます（保存はこの端末の中だけ）
3. **データ編集** … ヘッダーの「データ編集」から、画面の数字・文章をその場で書き換えて保存
   - 経営数値（売上・利益・目標・達成率）
   - 予定・お知らせ（追加・削除もできます）
   - プロジェクト（進捗はスライダーで調整）
   - AI社員23人（担当・稼働状況・タスク数）
   - YouTube指標・次回ライブ
4. **リアルタイム同期** … パソコンで変更したらスマホ側も自動で書き換わります
5. **AI秘書チャット** … 保存したデータを見て答えるようになりました

---

## セットアップ（ターミナル不要）

### 手順1：Firebaseプロジェクトを作る

1. [Firebaseコンソール](https://console.firebase.google.com/) で「プロジェクトを追加」
2. 左メニュー **Authentication** → 「始める」 → **メール／パスワード** を有効にする
3. 「Users」タブ → 「ユーザーを追加」で、社長用のメールアドレスとパスワードを登録
4. 左メニュー **Firestore Database** → 「データベースの作成」→ 本番環境モードで作成
5. Firestore の **ルール** タブを開き、同梱の `firestore.rules` の中身を貼り付けて「公開」
6. 左メニュー **プロジェクトの設定** → 「マイアプリ」→ ウェブアプリを追加し、
   表示される `firebaseConfig` の6つの値を控えます

### 手順2：環境変数を登録する

**ローカルで動かす場合**
`.env.example` をコピーして `.env` という名前にし、6つの値を貼り付けます。

**Vercelの場合**
Vercel のプロジェクト → **Settings → Environment Variables** に、次の6つを登録します。

| 変数名 | 入れる値 |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | apiKey |
| `VITE_FIREBASE_AUTH_DOMAIN` | authDomain |
| `VITE_FIREBASE_PROJECT_ID` | projectId |
| `VITE_FIREBASE_STORAGE_BUCKET` | storageBucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | messagingSenderId |
| `VITE_FIREBASE_APP_ID` | appId |

登録したら **Deployments → 最新のデプロイ → Redeploy** を押してください（環境変数は再デプロイで反映されます）。

> Firebaseのこの6つの値は、公開されても問題ない値なので `VITE_` を付けてOKです。
> OpenAI・Groq などのAPIキーは絶対に `VITE_` を付けないでください（フェーズ3で対応します）。

### 手順3：ログインドメインを許可する

Firebaseコンソール → **Authentication → Settings → 承認済みドメイン** に、
Vercelのドメイン（例：`your-app.vercel.app`）を追加してください。
これを忘れるとログインできません。

---

## GitHub Desktop / Vercel の流れ

1. このフォルダの中身をリポジトリのフォルダにコピー
2. GitHub Desktop で「Commit to main」→「Push origin」
3. Vercel が自動でビルド・公開します（Framework Preset は Vite、Build Command は `npm run build`、Output は `dist`）

---

## データの保存先

| 状態 | 保存先 |
| --- | --- |
| ログイン中 | Firestore の `system / dashboard` ドキュメント |
| 見るだけモード | この端末のブラウザ内（localStorage） |

初期データは `src/data/defaults.ts` にあります。
Firestore が空のときは、この初期データが自動で書き込まれます。
「データ編集」の「初期値に戻す」で、いつでもこの状態に戻せます。

---

## ファイル構成

```
src/
├ lib/
│  ├ firebase.ts   Firebaseの初期化
│  ├ auth.tsx      ログイン状態の管理
│  └ data.tsx      Firestoreの読み書き
├ data/
│  └ defaults.ts   初期データ（AI社員23人・経営数値など）
├ components/      ヘッダー・カード・グラフ・編集画面など
├ screens/
│  ├ Dashboard.tsx 画面① 経営・AI社員ダッシュボード
│  └ Studio.tsx    画面② クリエイティブスタジオ
└ App.tsx          ログイン判定と画面切り替え
```

---

## 画像の入れ方

| 置き場所 | 内容 |
| --- | --- |
| `public/avatars/` | AI社員のアバター画像（ファイル名は同フォルダのREADME.txt参照） |
| `public/gallery/` | 画像生成ギャラリー・MVサムネイル・YouTubeサムネイル |

画像が無くてもネオンのプレースホルダーが表示されるので、エラーにはなりません。

---

## 技術構成

| 項目 | 技術 |
| --- | --- |
| フロントエンド | React 18 + TypeScript |
| ビルド | Vite 5 |
| スタイル | Tailwind CSS 3 |
| 認証・データベース | Firebase Auth / Firestore |
| グラフ | 自作SVG（外部ライブラリなし） |
| ホスティング | Vercel |

---

## 次のフェーズ

- **フェーズ3**：AI秘書を Groq / Gemini / OpenAI に接続（Vercel関数でAPIキーを保護）
- **フェーズ4**：タスク・楽曲・画像の実データ管理、Firebase Storage へのアップロード
- **フェーズ5**：Electron化（Windowsデスクトップアプリ・自動アップデート）
