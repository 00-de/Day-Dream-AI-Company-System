# DayDream AI Company System v1.6.0

社長1人 ＋ AI社員23人による、次世代型AIエンターテインメント会社の統合ダッシュボードです。

- **フェーズ1**：2画面のUI（完了）
- **フェーズ2**：Firebase Auth（5アカウント・権限）＋ Firestore 連携（完了）
- **フェーズ3**：AI秘書を Groq / Gemini / OpenAI に接続（完了）
- **フェーズ4**：タスク管理＋Firebase Storage へのファイルアップロード（完了）
- **AI会議ルーム**：AI社員を集めて議論・議事録・タスク化 ← 追加しました

> アバター画像の作り方は `AVATAR_PROMPTS.md`、ログインアカウントは `ACCOUNTS.md`、AI接続は `AI_SETUP.md`、ファイル管理の設定は `STORAGE_SETUP.md` に詳しく書いてあります。

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
| `public/avatars/` | AI社員23人のアバター（SVGが同梱済み。同名のPNGを置くと差し替わります） |
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

## フェーズ3でできるようになったこと

- AI秘書チャットが **Groq → Gemini → OpenAI** の順に自動フォールバックして接続します
- **APIキーはVercelのサーバー側（`/api/chat`）だけが読み込みます**。ブラウザには出ません
- APIキーが無くても **簡易応答モード** でそのまま使えます（保存中のデータを見て答えます）
- チャット相手を **AI社員10人から選べます**（AI秘書・AI社長・蓮AI・結衣AIなど）
- AIは、保存中の売上・予定・AI社員・ライブ・YouTubeの情報を見た上で答えます
- 設定画面で、いまどのAIに接続できているか確認できます

セットアップ手順は **`AI_SETUP.md`** を見てください。

### 環境変数（AI用・`VITE_` は絶対に付けない）

| 変数名 | 内容 |
| --- | --- |
| `GROQ_API_KEY` | Groq のAPIキー（おすすめ・無料枠が大きい） |
| `GEMINI_API_KEY` | Google Gemini のAPIキー |
| `OPENAI_API_KEY` | OpenAI のAPIキー |

3つ全部は不要です。1つ登録すれば動きます。

---

## フェーズ4でできるようになったこと

- **タスク管理** … 経営ダッシュボードで、やること・担当AI社員・期限・優先度を登録。完了率と期限切れが自動で分かります
- **ファイルアップロード** … 画像・楽曲・動画・書類を Firebase Storage にアップロード。ドラッグ＆ドロップ対応
- アップロードした動画は **MV制作パネルでそのまま再生** できます
- 楽曲は音楽制作パネル、画像は画像生成パネルにライブラリとして並びます
- ファイル管理の件数と使用容量が、実データから自動計算されます
- 閲覧のみの人（中尾さん・シュンさん）には、アップロード枠と削除ボタンが表示されません

設定手順は **`STORAGE_SETUP.md`** を見てください。
Firebaseコンソールで **Storage を有効化 → `storage.rules` を公開 → `firestore.rules` を更新** の3つが必要です。

### Firestore の構成

| コレクション | 内容 |
| --- | --- |
| `system/dashboard` | 経営数値・AI社員・お知らせなど（フェーズ2） |
| `tasks` | タスク（フェーズ4） |
| `media` | アップロードしたファイルの情報（フェーズ4） |

---

## AI会議ルーム（画面③）

ヘッダーの **「会議ルーム」** から開けます。

1. **議題を入力**（例：「次のシングルの方向性を決めたい」）。議題の例ボタンからも選べます
2. **AI社員を2〜6人選ぶ**。それぞれの担当の立場から意見が出ます
3. **発言の回数（1〜3巡）を選ぶ**。1巡＝全員が1回ずつ発言
4. **「会議を開始する」** を押すと、発言が1つずつ順番に表示されます
5. 会議が終わると **議事録・決定したこと・次にやること** が自動でまとまります
6. 「タスクに登録」を押すと、そのまま **タスク管理** に入ります

- 発言中のAI社員は、上の参加者席が光ります
- 過去の会議は右側に一覧で残り、クリックすると読み返せます
- AIは売上・予定・プロジェクト進捗・ライブ情報を見た上で議論します
- APIキーが無い場合も、担当分野に応じた簡易的な会議が生成されます

Firestore に **`meetings`** コレクションが追加されています。
`firestore.rules` を更新版に貼り替えてください。

---

## 次のフェーズ

- **フェーズ5**：Electron化（Windowsデスクトップアプリ・自動アップデート）
