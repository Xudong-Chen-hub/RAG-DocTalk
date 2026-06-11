import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type Lang = 'zh-CN' | 'en' | 'ja' | 'ko'

const t = {
  'nav.all':    { 'zh-CN':'所有笔记', en:'All Notes', ja:'すべてのノート', ko:'모든 노트' },
  'nav.starred':{ 'zh-CN':'收藏', en:'Starred', ja:'お気に入り', ko:'즐겨찾기' },
  'nav.settings':{ 'zh-CN':'设置', en:'Settings', ja:'設定', ko:'설정' },
  'login.title':{ 'zh-CN':'欢迎回来', en:'Welcome back', ja:'おかえりなさい', ko:'돌아온 것을 환영합니다' },
  'login.desc':{ 'zh-CN':'登录你的 RAG-DocTalk 账号', en:'Sign in to your RAG-DocTalk account', ja:'RAG-DocTalk アカウントにログイン', ko:'RAG-DocTalk 계정에 로그인하세요' },
  'login.email':{ 'zh-CN':'邮箱地址', en:'Email address', ja:'メールアドレス', ko:'이메일 주소' },
  'login.password':{ 'zh-CN':'密码', en:'Password', ja:'パスワード', ko:'비밀번호' },
  'login.btn':{ 'zh-CN':'登录', en:'Sign in', ja:'ログイン', ko:'로그인' },
  'login.switch':{ 'zh-CN':'还没有账号？', en:"Don't have an account?", ja:'アカウントをお持ちでないですか？', ko:'계정이 없으신가요?' },
  'login.register':{ 'zh-CN':'注册', en:'Register', ja:'登録', ko:'등록' },
  'login.error':{ 'zh-CN':'请输入邮箱和密码', en:'Please enter email and password', ja:'メールアドレスとパスワードを入力してください', ko:'이메일과 비밀번호를 입력하세요' },
  'sidebar.loginHint':{ 'zh-CN':'登录后可查看历史笔记', en:'Sign in to view history', ja:'ログインして履歴を表示', ko:'로그인하여 기록 보기' },
  'sidebar.login':{ 'zh-CN':'登录', en:'Sign in', ja:'ログイン', ko:'로그인' },
  'sidebar.logout':{ 'zh-CN':'退出登录', en:'Sign out', ja:'ログアウト', ko:'로그아웃' },
  'sidebar.dark':{ 'zh-CN':'深色模式', en:'Dark mode', ja:'ダークモード', ko:'다크 모드' },
  'sidebar.light':{ 'zh-CN':'浅色模式', en:'Light mode', ja:'ライトモード', ko:'라이트 모드' },
  'search.placeholder':{ 'zh-CN':'搜索笔记...', en:'Search notes...', ja:'ノートを検索...', ko:'노트 검색...' },
  'btn.newNote':{ 'zh-CN':'+ 新建笔记', en:'+ New Note', ja:'+ 新規ノート', ko:'+ 새 노트' },
  'guest.title':{ 'zh-CN':'欢迎使用 RAG-DocTalk', en:'Welcome to RAG-DocTalk', ja:'RAG-DocTalk へようこそ', ko:'RAG-DocTalk에 오신 것을 환영합니다' },
  'guest.desc':{ 'zh-CN':'登录后可以查看历史笔记、管理文档和对话。', en:'Sign in to view history, manage documents and conversations.', ja:'ログインして履歴の表示、文書や会話の管理ができます。', ko:'로그인하여 기록을 보고 문서와 대화를 관리하세요.' },
  'guest.login':{ 'zh-CN':'登录账号', en:'Sign in', ja:'ログイン', ko:'로그인' },
  'empty.title':{ 'zh-CN':'还没有笔记', en:'No notes yet', ja:'まだノートがありません', ko:'아직 노트가 없습니다' },
  'empty.desc':{ 'zh-CN':'上传你的第一份文档，开始提问。', en:'Upload your first document and start asking.', ja:'最初の文書をアップロードして質問を始めましょう。', ko:'첫 번째 문서를 업로드하고 질문을 시작하세요.' },
  'empty.btn':{ 'zh-CN':'新建笔记', en:'New Note', ja:'新規ノート', ko:'새 노트' },
  'settings.title':{ 'zh-CN':'设置', en:'Settings', ja:'設定', ko:'설정' },
  'settings.help':{ 'zh-CN':'RAG-DocTalk 帮助', en:'RAG-DocTalk Help', ja:'RAG-DocTalk ヘルプ', ko:'RAG-DocTalk 도움말' },
  'settings.feedback':{ 'zh-CN':'发送反馈', en:'Send Feedback', ja:'フィードバックを送信', ko:'피드백 보내기' },
  'settings.lang':{ 'zh-CN':'输出语言', en:'Output Language', ja:'出力言語', ko:'출력 언어' },
  'settings.license':{ 'zh-CN':'许可', en:'License', ja:'ライセンス', ko:'라이선스' },
  'settings.fontSize':{ 'zh-CN':'字体大小', en:'Font Size', ja:'フォントサイズ', ko:'글꼴 크기' },
  'settings.shortcuts':{ 'zh-CN':'键盘快捷键', en:'Keyboard Shortcuts', ja:'キーボードショートカット', ko:'키보드 단축키' },
  'settings.storage':{ 'zh-CN':'数据与存储', en:'Data & Storage', ja:'データとストレージ', ko:'데이터 및 저장소' },
  'settings.about':{ 'zh-CN':'关于 RAG-DocTalk', en:'About RAG-DocTalk', ja:'RAG-DocTalk について', ko:'RAG-DocTalk 정보' },
} as const

export const usePrefsStore = defineStore('prefs', () => {
  const lang = ref<Lang>((localStorage.getItem('lang') as Lang) || 'zh-CN')
  const fontSize = ref(Number(localStorage.getItem('fontSize')) || 16)

  function tr(key: keyof typeof t): string {
    return t[key]?.[lang.value] ?? key
  }

  watch(lang, (v) => {
    localStorage.setItem('lang', v)
  })

  watch(fontSize, (v) => {
    localStorage.setItem('fontSize', String(v))
    document.documentElement.style.fontSize = v + 'px'
  })

  // Apply on init
  document.documentElement.style.fontSize = fontSize.value + 'px'

  return { lang, fontSize, tr }
})
