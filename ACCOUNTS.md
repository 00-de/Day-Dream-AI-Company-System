# ログインアカウント一覧（5人）

Firebaseコンソール → **Authentication → Users → ユーザーを追加** で、
下の5件をそのまま登録してください。

> Firebaseの「メール／パスワード」認証は、実際に受信できるメールアドレスである必要はありません。
> 形式が正しければ、独自ドメインを持っていなくてもそのまま使えます。

| 役割 | メールアドレス | パスワード | データ編集 |
| --- | --- | --- | --- |
| 社長（トシさん） | `president@daydream-ai.jp` | `Neon7964$Stage` | できる |
| 高木さん（企画・プロデュース） | `takagi@daydream-ai.jp` | `Star9278#Dust` | できる |
| 太田さん（イベント企画・運営） | `ota@daydream-ai.jp` | `Sound8813#Wave` | できる |
| 中尾さん（音響・サウンド管理） | `nakao@daydream-ai.jp` | `Deep9703%Night` | 閲覧のみ |
| シュンさん（映像・配信サポート） | `shun@daydream-ai.jp` | `Sky7232!Beat` | 閲覧のみ |

---

## 権限のしくみ

- **データ編集ができる人**：ヘッダーに「データ編集」ボタンが表示されます
- **閲覧のみの人**：ボタンが表示されず、名前の下に「閲覧のみ」と出ます
- 画面上の制限だけでなく、`firestore.rules` でサーバー側でも止めています
  （ブラウザの開発者ツールから書き換えようとしても保存できません）

権限を変えたいときは、次の2か所を同じ内容に書き換えてください。

1. `src/lib/accounts.ts` の `canEdit`（画面の表示）
2. `firestore.rules` の `canWrite()`（サーバー側の制限）

---

## パスワードの取り扱い

- この5件は**初期パスワード**です。運用を始める前に、各自で変更することをおすすめします
- 変更方法：Firebaseコンソール → Authentication → Users → 対象ユーザーの「…」→ パスワードを再設定
- このファイル（ACCOUNTS.md）は**GitHubの公開リポジトリに置かないでください**。
  公開リポジトリで運用する場合は、`.gitignore` に `ACCOUNTS.md` を追加してください

---

## メールアドレスを変えたい場合

`daydream-ai.jp` の部分は自由に変えられます。変更するときは次の3か所をそろえてください。

1. Firebase Authentication に登録するメールアドレス
2. `src/lib/accounts.ts` の `email`
3. `firestore.rules` の `canRead()` / `canWrite()` の一覧
