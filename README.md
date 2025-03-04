## 探针下载页面

支持 IE9+

## Usage

下载 ngnix: https://nginx.org/en/download.html

解压下载后的安装包，打开 ngnix 的配置文件，nginx/conf/nginx.conf

在配置文件中的 server 部分，添加以下代码
root .../UHS_MAIN/UES; //root 为本地代码文件所在位置,UHS_MAIN 为分支名称
location /api {
proxy_pass https://10.160.43.203; //配置发送 ajax 请求的代理
}

在 nginx 文件夹下使用 start nginx.exe 启动 nginx，打开浏览其访问 localhost[:端口号]/download-agent/ 进行访问，后面可以加语言参数，language=zh_CN(或者 en_US), localhost 是 nginx 配置文件中的 server_name 值
