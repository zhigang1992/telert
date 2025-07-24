import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Telert',
  description: 'Telegram notifications made easy',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/' },
      { text: 'Usage', link: '/usage' },
      { text: 'Deployment', link: '/deployment' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/example/telert' }
    ]
  }
})
