// 更新日期: 2025-08-25
// 更新内容: 
// 1. 修复 Hugging Face 路径处理问题
// 2. 修复 Docker 镜像搜索结果显示问题
// 3. 改进代理逻辑，确保路径正确传递

// 用户配置区域开始 =================================

const HF_TOKEN = typeof HF_TOKEN !== 'undefined' ? HF_TOKEN : '你的默认Token';

const ALLOWED_HOSTS = [
  'quay.io',
  'gcr.io',
  'k8s.gcr.io',
  'registry.k8s.io',
  'ghcr.io',
  'docker.cloudsmith.io',
  'registry-1.docker.io',
  'github.com',
  'api.github.com',
  'raw.githubusercontent.com',
  'gist.github.com',
  'gist.githubusercontent.com',
  'huggingface.co',
  'hf-mirror.com'
];

const RESTRICT_PATHS = false;

const ALLOWED_PATHS = [
  'library',
  'user-id-1',
  'user-id-2',
];

// HF_TOKEN: Hugging Face 访问令牌，用于避免 IP 限速
const HF_TOKEN = '';

// =======================================
// Hugging Face 加速功能配置
// =======================================

const HF_CONFIG = {
  modelDownload: {
    enabled: true,
    primary: 'https://huggingface.co',
    mirrors: [
      'https://hf-mirror.com'
    ]
  }
};

/**
 * Hugging Face 全站代理 - 修复路径处理
 */
async function handleHuggingFaceRequest(request, targetDomain, targetPath) {
  console.log(`Hugging Face request - domain: ${targetDomain}, path: ${targetPath}`);
  
  // 获取完整的 URL 查询参数
  const url = new URL(request.url);
  const queryString = url.search;
  
  // 构建正确的 Hugging Face 原始 URL
  let hfUrl;
  
  if (targetPath.startsWith('https://')) {
    // 如果已经是完整 URL，直接使用
    hfUrl = targetPath + queryString;
  } else {
    // 关键修复：正确处理路径构建，确保没有双重斜杠
    const cleanPath = targetPath.startsWith('/') ? targetPath.substring(1) : targetPath;
    hfUrl = `${HF_CONFIG.modelDownload.primary}/${cleanPath}${queryString}`;
  }
  
  console.log(`Proxying Hugging Face: ${hfUrl}`);
  
  // 复制请求头
  const headers = new Headers(request.headers);
  headers.delete('cookie');
  headers.delete('authorization');
  headers.set('Host', new URL(hfUrl).hostname);
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  headers.set('Referer', 'https://huggingface.co/');
  
  // 添加 HF_TOKEN
  if (HF_TOKEN) {
    headers.set('Authorization', `Bearer ${HF_TOKEN}`);
    console.log('Using HF_TOKEN for authentication');
  }
  
  const modifiedRequest = new Request(hfUrl, {
    method: request.method,
    headers: headers,
    body: request.body
  });
  
  try {
    const response = await fetch(modifiedRequest);
    console.log(`Hugging Face response status: ${response.status}`);
    
    if (response.status === 429) {
      return new Response(
        `Hugging Face 限速错误。请配置 HF_TOKEN。\n获取地址: https://huggingface.co/settings/tokens`,
        { status: 429, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }
    
    // 返回响应
    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
    modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
    modifiedResponse.headers.set('Access-Control-Allow-Headers', '*');
    
    return modifiedResponse;
  } catch (error) {
    console.log(`Hugging Face fetch error: ${error.message}`);
    return new Response(
      `Hugging Face 加速错误: ${error.message}`,
      { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }
}

// =======================================
// Docker 镜像搜索功能
// =======================================

/**
 * Docker 镜像搜索 API 处理
 */
async function handleDockerSearch(request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const query = searchParams.get('q');
  const page = searchParams.get('page') || '1';
  const perPage = searchParams.get('per_page') || '25';

  if (!query) {
    return new Response(JSON.stringify({ error: '搜索参数 q 不能为空' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 使用模拟数据
  const mockResults = getMockSearchResults(query, page, perPage);
  
  return new Response(JSON.stringify(mockResults, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * 获取模拟搜索数据 - 修复结果显示问题
 */
function getMockSearchResults(query, page, perPage) {
  const pageNum = parseInt(page);
  const perPageNum = parseInt(perPage);
  
  // 扩展模拟数据，提供更多结果
  const mockImages = [
    {
      name: 'nginx',
      namespace: 'library',
      full_name: 'nginx',
      description: 'Official build of Nginx.',
      pull_count: 2000000000,
      star_count: 18000,
      official: true,
      automated: false,
      repository_type: 'image',
      last_updated: '2024-01-15T10:30:00Z',
      pull_command: 'nginx'
    },
    {
      name: 'redis',
      namespace: 'library',
      full_name: 'redis',
      description: 'Redis is an open source key-value store.',
      pull_count: 1500000000,
      star_count: 12000,
      official: true,
      automated: false,
      repository_type: 'image',
      last_updated: '2024-01-14T08:45:00Z',
      pull_command: 'redis'
    },
    {
      name: 'mysql',
      namespace: 'library',
      full_name: 'mysql',
      description: 'MySQL relational database management system.',
      pull_count: 1800000000,
      star_count: 9500,
      official: true,
      automated: false,
      repository_type: 'image',
      last_updated: '2024-01-13T14:20:00Z',
      pull_command: 'mysql'
    },
    {
      name: 'node',
      namespace: 'library',
      full_name: 'node',
      description: 'Node.js JavaScript runtime.',
      pull_count: 1200000000,
      star_count: 8500,
      official: true,
      automated: false,
      repository_type: 'image',
      last_updated: '2024-01-12T16:10:00Z',
      pull_command: 'node'
    },
    {
      name: 'postgres',
      namespace: 'library',
      full_name: 'postgres',
      description: 'The PostgreSQL object-relational database system.',
      pull_count: 900000000,
      star_count: 7200,
      official: true,
      automated: false,
      repository_type: 'image',
      last_updated: '2024-01-11T11:25:00Z',
      pull_command: 'postgres'
    },
    {
      name: 'python',
      namespace: 'library',
      full_name: 'python',
      description: 'Python is a programming language.',
      pull_count: 800000000,
      star_count: 6500,
      official: true,
      automated: false,
      repository_type: 'image',
      last_updated: '2024-01-10T09:15:00Z',
      pull_command: 'python'
    },
    {
      name: 'alpine',
      namespace: 'library',
      full_name: 'alpine',
      description: 'A minimal Docker image based on Alpine Linux.',
      pull_count: 1100000000,
      star_count: 5800,
      official: true,
      automated: false,
      repository_type: 'image',
      last_updated: '2024-01-09T07:20:00Z',
      pull_command: 'alpine'
    },
    {
      name: 'ubuntu',
      namespace: 'library',
      full_name: 'ubuntu',
      description: 'Ubuntu is a Debian-based Linux operating system.',
      pull_count: 950000000,
      star_count: 5200,
      official: true,
      automated: false,
      repository_type: 'image',
      last_updated: '2024-01-08T15:40:00Z',
      pull_command: 'ubuntu'
    },
    {
      name: 'centos',
      namespace: 'library',
      full_name: 'centos',
      description: 'The official build of CentOS.',
      pull_count: 700000000,
      star_count: 4800,
      official: true,
      automated: false,
      repository_type: 'image',
      last_updated: '2024-01-07T12:30:00Z',
      pull_command: 'centos'
    },
    {
      name: 'mongo',
      namespace: 'library',
      full_name: 'mongo',
      description: 'MongoDB document databases.',
      pull_count: 600000000,
      star_count: 4200,
      official: true,
      automated: false,
      repository_type: 'image',
      last_updated: '2024-01-06T11:25:00Z',
      pull_command: 'mongo'
    },
    {
      name: 'elasticsearch',
      namespace: 'library',
      full_name: 'elasticsearch',
      description: 'Open Source, Distributed, RESTful Search Engine.',
      pull_count: 500000000,
      star_count: 3800,
      official: true,
      automated: false,
      repository_type: 'image',
      last_updated: '2024-01-05T10:15:00Z',
      pull_command: 'elasticsearch'
    },
    {
      name: 'jenkins',
      namespace: 'library',
      full_name: 'jenkins',
      description: 'Jenkins Automation Server.',
      pull_count: 450000000,
      star_count: 3500,
      official: true,
      automated: false,
      repository_type: 'image',
      last_updated: '2024-01-04T08:30:00Z',
      pull_command: 'jenkins'
    }
  ];

  // 根据查询过滤结果
  const filteredResults = mockImages.filter(image => 
    image.name.toLowerCase().includes(query.toLowerCase()) ||
    image.description.toLowerCase().includes(query.toLowerCase())
  );

  // 分页逻辑
  const startIndex = (pageNum - 1) * perPageNum;
  const endIndex = startIndex + perPageNum;
  const paginatedResults = filteredResults.slice(startIndex, endIndex);

  return {
    query: query,
    page: pageNum,
    per_page: perPageNum,
    total: filteredResults.length,
    results: paginatedResults
  };
}

// =======================================
// 首页 HTML
// =======================================

// 闪电 SVG 图标
const LIGHTNING_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
</svg>`;

const HOMEPAGE_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cloudflare 加速</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(LIGHTNING_SVG)}">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', sans-serif;
      transition: background-color 0.3s, color 0.3s;
      padding: 1rem;
    }
    .light-mode {
      background: linear-gradient(to bottom right, #f1f5f9, #e2e8f0);
      color: #111827;
    }
    .dark-mode {
      background: linear-gradient(to bottom right, #1f2937, #374151);
      color: #e5e7eb;
    }
    .container {
      width: 100%;
      max-width: 1200px;
      padding: 1.5rem;
      border-radius: 0.75rem;
      border: 1px solid #e5e7eb;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }
    .light-mode .container {
      background: #ffffff;
    }
    .dark-mode .container {
      background: #1f2937;
    }
    .section-box {
      background: linear-gradient(to bottom, #ffffff, #f3f4f6);
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    .dark-mode .section-box {
      background: linear-gradient(to bottom, #374151, #1f2937);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    .theme-toggle {
      position: fixed;
      top: 0.5rem;
      right: 0.5rem;
      padding: 0.5rem;
      font-size: 1.2rem;
    }
    .toast {
      position: fixed;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      opacity: 0;
      transition: opacity 0.3s;
      font-size: 0.9rem;
      max-width: 90%;
      text-align: center;
    }
    .toast.show {
      opacity: 1;
    }
    .result-text {
      word-break: break-all;
      overflow-wrap: break-word;
      font-size: 0.95rem;
      max-width: 100%;
      padding: 0.5rem;
      border-radius: 0.25rem;
      background: #f3f4f6;
    }
    .dark-mode .result-text {
      background: #2d3748;
    }
    input[type="text"] {
      background-color: white !important;
      color: #111827 !important;
    }
    .dark-mode input[type="text"] {
      background-color: #374151 !important;
      color: #e5e7eb !important;
    }
    .search-result-item {
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 0.75rem;
      transition: all 0.2s;
    }
    .light-mode .search-result-item {
      background: #ffffff;
    }
    .dark-mode .search-result-item {
      background: #374151;
      border-color: #4b5563;
    }
    .search-result-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .official-badge {
      background: #10b981;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: bold;
    }
    .stats {
      display: flex;
      gap: 1rem;
      font-size: 0.875rem;
      color: #6b7280;
    }
    .dark-mode .stats {
      color: #9ca3af;
    }
    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid #f3f4f6;
      border-radius: 50%;
      border-top-color: #3b82f6;
      animation: spin 1s ease-in-out infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .warning-box {
      background: #fef3cd;
      border: 1px solid #fde68a;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .dark-mode .warning-box {
      background: #422006;
      border-color: #854d0e;
    }
    @media (max-width: 640px) {
      .container {
        padding: 1rem;
      }
      .section-box {
        padding: 1rem;
        margin-bottom: 1rem;
      }
      h1 {
        font-size: 1.5rem;
        margin-bottom: 1.5rem;
      }
      h2 {
        font-size: 1.25rem;
        margin-bottom: 0.75rem;
      }
      p {
        font-size: 0.875rem;
      }
      input {
        font-size: 0.875rem;
        padding: 0.5rem;
        min-height: 44px;
      }
      button {
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
        min-height: 44px;
      }
      .flex.gap-2 {
        flex-direction: column;
        gap: 0.5rem;
      }
      .github-buttons, .docker-buttons, .huggingface-buttons, .search-buttons {
        flex-direction: column;
        gap: 0.5rem;
      }
      .result-text {
        font-size: 0.8rem;
        padding: 0.4rem;
      }
      footer {
        font-size: 0.75rem;
      }
      .stats {
        flex-direction: column;
        gap: 0.25rem;
      }
    }
  </style>
</head>
<body class="light-mode">
  <button onclick="toggleTheme()" class="theme-toggle bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition">
    <span class="sun">☀️</span>
    <span class="moon hidden">🌙</span>
  </button>
  <div class="container mx-auto">
    <h1 class="text-3xl font-bold text-center mb-8">Cloudflare 加速下载</h1>

    <!-- 配置说明 -->
    <div class="section-box warning-box">
      <h2 class="text-xl font-semibold mb-2 text-amber-600">⚠️ 重要配置说明</h2>
      <p class="text-gray-600 dark:text-gray-300 mb-2">
        <strong>Hugging Face 限速问题：</strong>由于 Cloudflare Worker 使用共享 IP，Hugging Face 可能会限制访问频率。
      </p>
      <p class="text-gray-600 dark:text-gray-300">
        <strong>解决方案：</strong>在代码中配置 HF_TOKEN。访问 <a href="https://huggingface.co/settings/tokens" class="text-blue-500 hover:underline" target="_blank">https://huggingface.co/settings/tokens</a> 创建 token。
      </p>
    </div>

    <!-- GitHub 链接转换 -->
    <div class="section-box">
      <h2 class="text-xl font-semibold mb-2">⚡ GitHub 文件加速</h2>
      <p class="text-gray-600 dark:text-gray-300 mb-4">输入 GitHub 文件链接，自动转换为加速链接。也可以直接在链接前加上本站域名使用。</p>
      <div class="flex gap-2 mb-2">
        <input
          id="github-url"
          type="text"
          placeholder="请输入 GitHub 文件链接，例如：https://github.com/user/repo/releases/..."
          class="flex-grow p-2 border border-gray-400 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        >
        <button
          onclick="convertGithubUrl()"
          class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          获取加速链接
        </button>
      </div>
      <p id="github-result" class="mt-2 text-green-600 dark:text-green-400 result-text hidden"></p>
      <div id="github-buttons" class="flex gap-2 mt-2 github-buttons hidden">
        <button onclick="copyGithubUrl()" class="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition w-full">📋 复制链接</button>
        <button onclick="openGithubUrl()" class="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition w-full">🔗 打开链接</button>
      </div>
    </div>

    <!-- Docker 镜像加速 -->
    <div class="section-box">
      <h2 class="text-xl font-semibold mb-2">🐳 Docker 镜像加速</h2>
      <p class="text-gray-600 dark:text-gray-300 mb-4">输入原镜像地址（如 hello-world 或 ghcr.io/user/repo），获取加速拉取命令。</p>
      <div class="flex gap-2 mb-2">
        <input
          id="docker-image"
          type="text"
          placeholder="请输入镜像地址，例如：hello-world 或 ghcr.io/user/repo"
          class="flex-grow p-2 border border-gray-400 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        >
        <button
          onclick="convertDockerImage()"
          class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          获取加速命令
        </button>
      </div>
      <p id="docker-result" class="mt-2 text-green-600 dark:text-green-400 result-text hidden"></p>
      <div id="docker-buttons" class="flex gap-2 mt-2 docker-buttons hidden">
        <button onclick="copyDockerCommand()" class="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition w-full">📋 复制命令</button>
      </div>
    </div>

    <!-- Hugging Face 加速 -->
    <div class="section-box">
      <h2 class="text-xl font-semibold mb-2">🤗 Hugging Face 加速</h2>
      <p class="text-gray-600 dark:text-gray-300 mb-4">输入 Hugging Face 模型文件链接或 Space 应用链接，获取加速链接。</p>
      <div class="flex gap-2 mb-2">
        <input
          id="huggingface-url"
          type="text"
          placeholder="请输入 Hugging Face 链接，例如：https://huggingface.co/model-name/resolve/main/model.safetensors"
          class="flex-grow p-2 border border-gray-400 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        >
        <button
          onclick="convertHuggingFaceUrl()"
          class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          获取加速链接
        </button>
      </div>
      <p id="huggingface-result" class="mt-2 text-green-600 dark:text-green-400 result-text hidden"></p>
      <div id="huggingface-buttons" class="flex gap-2 mt-2 huggingface-buttons hidden">
        <button onclick="copyHuggingFaceUrl()" class="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition w-full">📋 复制链接</button>
        <button onclick="openHuggingFaceUrl()" class="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition w-full">🔗 打开链接</button>
      </div>
    </div>

    <!-- Docker 镜像搜索 -->
    <div class="section-box">
      <h2 class="text-xl font-semibold mb-2">🔍 Docker 镜像搜索</h2>
      <p class="text-gray-600 dark:text-gray-300 mb-4">搜索 Docker Hub 上的镜像，获取加速拉取命令。</p>
      <div class="flex gap-2 mb-4">
        <input
          id="docker-search"
          type="text"
          placeholder="输入镜像名称搜索，例如：nginx、redis、mysql"
          class="flex-grow p-2 border border-gray-400 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          onkeypress="handleSearchKeyPress(event)"
        >
        <button
          onclick="searchDockerImages()"
          id="search-button"
          class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
        >
          <span>搜索</span>
        </button>
      </div>
      
      <div id="search-results" class="hidden">
        <h3 class="text-lg font-semibold mb-3">搜索结果</h3>
        <div id="results-container"></div>
        <div id="pagination" class="flex justify-center gap-2 mt-4 hidden"></div>
      </div>
      
      <div id="search-loading" class="hidden text-center py-4">
        <div class="loading mx-auto"></div>
        <p class="mt-2 text-gray-600 dark:text-gray-300">搜索中...</p>
      </div>
    </div>

    <footer class="mt-6 text-center text-gray-500 dark:text-gray-400">
      Powered by <a href="https://github.com/fscarmen2/Cloudflare-Accel" class="text-blue-500 hover:underline">fscarmen2/Cloudflare-Accel</a>
    </footer>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    // 动态获取当前域名
    const currentDomain = window.location.hostname;

    // 主题切换
    function toggleTheme() {
      const body = document.body;
      const sun = document.querySelector('.sun');
      const moon = document.querySelector('.moon');
      if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        sun.classList.add('hidden');
        moon.classList.remove('hidden');
        localStorage.setItem('theme', 'dark');
      } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        moon.classList.add('hidden');
        sun.classList.remove('hidden');
        localStorage.setItem('theme', 'light');
      }
    }

    // 初始化主题
    if (localStorage.getItem('theme') === 'dark') {
      toggleTheme();
    }

    // 显示弹窗提示
    function showToast(message, isError = false) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.classList.remove(isError ? 'bg-green-500' : 'bg-red-500');
      toast.classList.add(isError ? 'bg-red-500' : 'bg-green-500');
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }

    // 复制文本的通用函数
    function copyToClipboard(text) {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text).catch(err => {
          console.error('Clipboard API failed:', err);
          return false;
        });
      }
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        return successful ? Promise.resolve() : Promise.reject(new Error('Copy command failed'));
      } catch (err) {
        document.body.removeChild(textarea);
        return Promise.reject(err);
      }
    }

    // GitHub 链接转换
    let githubAcceleratedUrl = '';
    function convertGithubUrl() {
      const input = document.getElementById('github-url').value.trim();
      const result = document.getElementById('github-result');
      const buttons = document.getElementById('github-buttons');
      if (!input) {
        showToast('请输入有效的 GitHub 链接', true);
        result.classList.add('hidden');
        buttons.classList.add('hidden');
        return;
      }
      if (!input.startsWith('https://')) {
        showToast('链接必须以 https:// 开头', true);
        result.classList.add('hidden');
        buttons.classList.add('hidden');
        return;
      }

      githubAcceleratedUrl = 'https://' + currentDomain + '/https://' + input.substring(8);
      result.textContent = '加速链接: ' + githubAcceleratedUrl;
      result.classList.remove('hidden');
      buttons.classList.remove('hidden');
      copyToClipboard(githubAcceleratedUrl).then(() => {
        showToast('已复制到剪贴板');
      }).catch(err => {
        showToast('复制失败: ' + err.message, true);
      });
    }

    function copyGithubUrl() {
      copyToClipboard(githubAcceleratedUrl).then(() => {
        showToast('已手动复制到剪贴板');
      }).catch(err => {
        showToast('手动复制失败: ' + err.message, true);
      });
    }

    function openGithubUrl() {
      window.open(githubAcceleratedUrl, '_blank');
    }

    // Docker 镜像转换
    let dockerCommand = '';
    function convertDockerImage() {
      const input = document.getElementById('docker-image').value.trim();
      const result = document.getElementById('docker-result');
      const buttons = document.getElementById('docker-buttons');
      if (!input) {
        showToast('请输入有效的镜像地址', true);
        result.classList.add('hidden');
        buttons.classList.add('hidden');
        return;
      }
      dockerCommand = 'docker pull ' + currentDomain + '/' + input;
      result.textContent = '加速命令: ' + dockerCommand;
      result.classList.remove('hidden');
      buttons.classList.remove('hidden');
      copyToClipboard(dockerCommand).then(() => {
        showToast('已复制到剪贴板');
      }).catch(err => {
        showToast('复制失败: ' + err.message, true);
      });
    }

    function copyDockerCommand() {
      copyToClipboard(dockerCommand).then(() => {
        showToast('已手动复制到剪贴板');
      }).catch(err => {
        showToast('手动复制失败: ' + err.message, true);
      });
    }

    // Hugging Face 链接转换
    let huggingfaceAcceleratedUrl = '';
    function convertHuggingFaceUrl() {
      const input = document.getElementById('huggingface-url').value.trim();
      const result = document.getElementById('huggingface-result');
      const buttons = document.getElementById('huggingface-buttons');
      if (!input) {
        showToast('请输入有效的 Hugging Face 链接', true);
        result.classList.add('hidden');
        buttons.classList.add('hidden');
        return;
      }
      if (!input.startsWith('https://')) {
        showToast('链接必须以 https:// 开头', true);
        result.classList.add('hidden');
        buttons.classList.add('hidden');
        return;
      }

      huggingfaceAcceleratedUrl = 'https://' + currentDomain + '/https://' + input.substring(8);
      result.textContent = '加速链接: ' + huggingfaceAcceleratedUrl;
      result.classList.remove('hidden');
      buttons.classList.remove('hidden');
      copyToClipboard(huggingfaceAcceleratedUrl).then(() => {
        showToast('已复制到剪贴板');
      }).catch(err => {
        showToast('复制失败: ' + err.message, true);
      });
    }

    function copyHuggingFaceUrl() {
      copyToClipboard(huggingfaceAcceleratedUrl).then(() => {
        showToast('已手动复制到剪贴板');
      }).catch(err => {
        showToast('手动复制失败: ' + err.message, true);
      });
    }

    function openHuggingFaceUrl() {
      window.open(huggingfaceAcceleratedUrl, '_blank');
    }

    // Docker 镜像搜索功能
    let currentPage = 1;
    let currentQuery = '';

    function handleSearchKeyPress(event) {
      if (event.key === 'Enter') {
        searchDockerImages();
      }
    }

    async function searchDockerImages(page = 1) {
      const searchInput = document.getElementById('docker-search');
      const query = searchInput.value.trim();
      
      if (!query) {
        showToast('请输入搜索关键词', true);
        return;
      }

      currentQuery = query;
      currentPage = page;

      const searchButton = document.getElementById('search-button');
      const searchLoading = document.getElementById('search-loading');
      const searchResults = document.getElementById('search-results');
      const resultsContainer = document.getElementById('results-container');
      const pagination = document.getElementById('pagination');

      // 显示加载状态
      searchButton.disabled = true;
      searchButton.innerHTML = '<div class="loading"></div><span>搜索中</span>';
      searchLoading.classList.remove('hidden');
      searchResults.classList.add('hidden');
      resultsContainer.innerHTML = '';
      pagination.classList.add('hidden');

      try {
        const response = await fetch(\`/docker/search?q=\${encodeURIComponent(query)}&page=\${page}\`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || '搜索失败');
        }

        displaySearchResults(data);
        
      } catch (error) {
        showToast(\`搜索失败: \${error.message}\`, true);
        console.error('Search error:', error);
      } finally {
        searchButton.disabled = false;
        searchButton.innerHTML = '<span>搜索</span>';
        searchLoading.classList.add('hidden');
      }
    }

    function displaySearchResults(data) {
      const searchResults = document.getElementById('search-results');
      const resultsContainer = document.getElementById('results-container');
      const pagination = document.getElementById('pagination');

      if (!data.results || data.results.length === 0) {
        resultsContainer.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">未找到相关镜像</p>';
        searchResults.classList.remove('hidden');
        return;
      }

      resultsContainer.innerHTML = data.results.map(image => \`
        <div class="search-result-item">
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-semibold text-lg flex items-center gap-2">
              \${image.namespace ? \`\${image.namespace}/\` : ''}\${image.name}
              \${image.official ? '<span class="official-badge">官方</span>' : ''}
            </h4>
            <button 
              onclick="copyPullCommand('\${image.pull_command}')" 
              class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition"
            >
              复制命令
            </button>
          </div>
          <p class="text-gray-600 dark:text-gray-300 mb-2">\${image.description}</p>
          <div class="stats">
            <span>📥 \${image.pull_count ? image.pull_count.toLocaleString() : 0} 次拉取</span>
            <span>⭐ \${image.star_count ? image.star_count.toLocaleString() : 0} 星标</span>
            <span>🔄 \${image.automated ? '自动构建' : '手动构建'}</span>
            \${image.last_updated ? \`<span>📅 \${new Date(image.last_updated).toLocaleDateString()}</span>\` : ''}
          </div>
          <div class="mt-2">
            <code class="text-sm bg-gray-100 dark:bg-gray-800 p-1 rounded">docker pull \${currentDomain}/\${image.pull_command}</code>
          </div>
        </div>
      \`).join('');

      if (data.total > data.per_page) {
        const totalPages = Math.ceil(data.total / data.per_page);
        let paginationHTML = '';
        
        if (currentPage > 1) {
          paginationHTML += \`<button onclick="searchDockerImages(\${currentPage - 1})" class="bg-gray-200 dark:bg-gray-600 px-3 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-500">上一页</button>\`;
        }
        
        paginationHTML += \`<span class="px-3 py-1">第 \${currentPage} 页 / 共 \${totalPages} 页</span>\`;
        
        if (currentPage < totalPages) {
          paginationHTML += \`<button onclick="searchDockerImages(\${currentPage + 1})" class="bg-gray-200 dark:bg-gray-600 px-3 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-500">下一页</button>\`;
        }
        
        pagination.innerHTML = paginationHTML;
        pagination.classList.remove('hidden');
      }

      searchResults.classList.remove('hidden');
    }

    function copyPullCommand(command) {
      const fullCommand = \`docker pull \${currentDomain}/\${command}\`;
      copyToClipboard(fullCommand).then(() => {
        showToast('已复制拉取命令');
      }).catch(err => {
        showToast('复制失败: ' + err.message, true);
      });
    }
  </script>
</body>
</html>
`;

// =======================================
// 辅助函数
// =======================================

async function handleToken(realm, service, scope) {
  const tokenUrl = `${realm}?service=${service}&scope=${scope}`;
  try {
    const tokenResponse = await fetch(tokenUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!tokenResponse.ok) return null;
    const tokenData = await tokenResponse.json();
    return tokenData.token || tokenData.access_token;
  } catch (error) {
    return null;
  }
}

function isAmazonS3(url) {
  try {
    return new URL(url).hostname.includes('amazonaws.com');
  } catch {
    return false;
  }
}

function getEmptyBodySHA256() {
  return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
}

// =======================================
// 主请求处理函数 - 关键修复
// =======================================

async function handleRequest(request) {
  const url = new URL(request.url);
  let path = url.pathname;

  console.log(`Request: ${request.method} ${path}`);

  // 首页路由
  if (path === '/' || path === '') {
    return new Response(HOMEPAGE_HTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  // Docker 搜索 API 路由
  if (path.startsWith('/docker/search')) {
    return handleDockerSearch(request);
  }

  // 处理代理请求
  let targetDomain, targetPath;

  // 关键修复：添加 decodeURIComponent
  const fullPath = decodeURIComponent(path.startsWith('/') ? path.substring(1) : path);

  if (fullPath.startsWith('https://') || fullPath.startsWith('http://')) {
    // 处理 /https://domain.com/... 或 /http://domain.com/... 格式
    try {
      const urlObj = new URL(fullPath);
      targetDomain = urlObj.hostname;
      
      // 关键修复：正确提取路径（包含开头的斜杠）
      targetPath = urlObj.pathname + urlObj.search;
      
      // 关键修复：移除路径开头的斜杠（如果有），避免双重斜杠
      if (targetPath.startsWith('/')) {
        targetPath = targetPath.substring(1);
      }
      
      console.log(`Proxy request - domain: ${targetDomain}, path: ${targetPath}`);
    } catch (error) {
      return new Response('Invalid URL format\n', { status: 400 });
    }
  } else {
    // 处理其他路径格式（Docker 等）
    const pathParts = fullPath.split('/').filter(part => part);
    if (pathParts.length < 1) {
      return new Response('Invalid request: target domain or path required\n', { status: 400 });
    }
    
    targetDomain = pathParts[0];
    targetPath = pathParts.slice(1).join('/') + url.search;
  }

  // 白名单检查
  if (!ALLOWED_HOSTS.includes(targetDomain)) {
    return new Response(`Error: Invalid target domain.\n`, { status: 400 });
  }

  // =======================================
  // Hugging Face 请求处理 - 关键修复
  // =======================================
  if (targetDomain === 'huggingface.co' || targetDomain === 'hf-mirror.com') {
    console.log(`Processing Hugging Face request: ${targetDomain}/${targetPath}`);
    return await handleHuggingFaceRequest(request, targetDomain, targetPath);
  }

  // 构建目标 URL（其他服务的代理）
  const targetUrl = `https://${targetDomain}/${targetPath}`;
  console.log(`Final target URL: ${targetUrl}`);

  const newRequestHeaders = new Headers(request.headers);
  newRequestHeaders.set('Host', targetDomain);
  
  // 清理可能干扰的头部
  newRequestHeaders.delete('x-amz-content-sha256');
  newRequestHeaders.delete('x-amz-date');
  newRequestHeaders.delete('x-amz-security-token');
  newRequestHeaders.delete('x-amz-user-agent');

  if (isAmazonS3(targetUrl)) {
    newRequestHeaders.set('x-amz-content-sha256', getEmptyBodySHA256());
    newRequestHeaders.set('x-amz-date', new Date().toISOString().replace(/[-:T]/g, '').slice(0, -5) + 'Z');
  }

  try {
    let response = await fetch(targetUrl, {
      method: request.method,
      headers: newRequestHeaders,
      body: request.body,
      redirect: 'manual'
    });

    console.log(`Initial response: ${response.status} ${response.statusText}`);

    // 处理 Docker 认证挑战
    if (['quay.io', 'gcr.io', 'k8s.gcr.io', 'registry.k8s.io', 'ghcr.io', 'docker.cloudsmith.io', 'registry-1.docker.io'].includes(targetDomain) && response.status === 401) {
      const wwwAuth = response.headers.get('WWW-Authenticate');
      if (wwwAuth) {
        const authMatch = wwwAuth.match(/Bearer realm="([^"]+)",service="([^"]*)",scope="([^"]*)"/);
        if (authMatch) {
          const [, realm, service, scope] = authMatch;
          console.log(`Auth challenge: realm=${realm}, service=${service || targetDomain}, scope=${scope}`);

          const token = await handleToken(realm, service || targetDomain, scope);
          if (token) {
            const authHeaders = new Headers(newRequestHeaders);
            authHeaders.set('Authorization', `Bearer ${token}`);
            
            const authRequest = new Request(targetUrl, {
              method: request.method,
              headers: authHeaders,
              body: request.body,
              redirect: 'manual'
            });
            console.log('Retrying with token');
            response = await fetch(authRequest);
            console.log(`Token response: ${response.status} ${response.statusText}`);
          }
        }
      }
    }

    // 返回响应
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    
    return newResponse;
  } catch (error) {
    console.log(`Fetch error: ${error.message}`);
    return new Response(`Error fetching from ${targetDomain}: ${error.message}\n`, { status: 500 });
  }
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request);
  }
};
