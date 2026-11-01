# Símbolo oficial, favicon e compartilhamento

O símbolo isolado enviado pelo proprietário foi preservado em `public/brand/azulskye-simbolo-oficial.png`. Foram derivados tamanhos de favicon (ICO, 32/48 PNG), Apple touch icon (180), aplicativo (192/512), ícone maskable com margem segura e imagem social JPEG 1200 × 1200. Fundo branco mantido para legibilidade, sem redesenho ou alteração das cores. A logo horizontal principal não foi alterada.

O HTML inicial fornece Open Graph e Twitter com URL HTTPS absoluta e versionada da imagem social, dimensões, tipo MIME e texto alternativo. Isso permite que crawlers obtenham a imagem sem executar o React. Os links de favicon, touch icon e manifesto apontam para nomes novos para evitar reutilização de arquivos antigos em cache.

Também foram atualizados os aliases antigos `/favicon.ico`, `/icon.svg`, `/icon-192.png` e `/icon-512.png`, a tela offline, o diálogo de instalação e a assinatura compacta dos painéis. O cache do service worker passou para v3.

A prévia do link é fornecida pelo site, mas o WhatsApp pode guardar uma imagem anterior. A atualização não altera retroativamente mensagens já enviadas. Para uma nova consulta, pode-se compartilhar `https://azul-skye.vercel.app/?v=3`. Não foi enviada mensagem nem usada a conta de WhatsApp do proprietário.
