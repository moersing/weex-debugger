var $ = function (selector) {
    return document.querySelector(selector)
}

var channelId = new URLSearchParams(location.search).get('channelId');

document.title = document.title + channelId


var screencastParams = null;
var isProphetPageShowing = false;

var $help=$('.help')
var $tipsMask=$('.tips-mask')
var $switchBtn=$('.page-switch-btn')
var $refreshBtn = $('#refresh-btn');
var $prophetPage = $('#prophet-page');
var $inspectorPage = $('#inspector');
var $debuggerMenu = $('#debugger-menu');
var $prophetMenu = $('#prophet-menu');
var $remoteDebug = $('#remote_debug');
var hash = window.location.hash || '#debugger';

var timeout

websocket = new WebSocket('ws://' + location.host + '/debugProxy/debugger/' + channelId);

websocket.onopen = function () {

    var toProphetPage = function () {
        $switchBtn.innerHTML = 'Debugger >>';
        $switchBtn.setAttribute('href', '#debugger')
        $prophetPage.style.visibility = 'visible';
        isProphetPageShowing = true;
        $debuggerMenu.style.display = 'none';
        $prophetMenu.style.display = 'block';
        $inspectorPage.style.display = 'none';
        isProphetPageShowing = true;
        
        websocket.send(JSON.stringify({method: 'Page.stopScreencast'}));
        websocket.send(JSON.stringify({method: 'WxDebug.disable'}))
        websocket.send(JSON.stringify({method: 'WxDebug.enableTracing', params: {status: true}}));
        if ($remoteDebug.checked) {
            $remoteDebug.checked = false;
            websocket.send(JSON.stringify({method: 'WxDebug.reload'}))
        }
    }

    var toDebuggerPage = function() {
        $switchBtn.innerHTML = 'Prophet >>';
        $switchBtn.setAttribute('href', '#prophet')
        $prophetPage.style.visibility = 'hidden';
        isProphetPageShowing = false;
        $prophetMenu.style.display = 'none';
        $debuggerMenu.style.display = 'block';
        $inspectorPage.style.display = 'block';
        isProphetPageShowing = false;        
        websocket.send(JSON.stringify({method: 'WxDebug.enableTracing', params: {status: false}}));
        if (screencastParams) {
            websocket.send(JSON.stringify({method: 'Page.startScreencast', params: screencastParams}));
        }
    }

    if (hash === '#debugger') {
        toDebuggerPage();
    }
    else if (hash === '#prophet') {
        toProphetPage();
    }

    window.addEventListener('hashchange', function(e) {
        hash = new URL(e.newURL).hash;
        if (hash === '#debugger') {
            toDebuggerPage();
        }
        else if (hash === '#prophet') {
            toProphetPage();
        }
    }, false);
    timeout = setTimeout(function () {
        history.back()
    }, 5000)
}
websocket.onclose = function () {
    history.back()
}

websocket.onmessage = function (event) {
    var message = JSON.parse(event.data)
    if (message.method === 'WxDebug.pushDebuggerInfo') {
        clearTimeout(timeout)
        if (message.params) {
            var device=message.params.device
            var name = device.name
            if (name.indexOf('com.') === 0) {
                var split = name.split('.')
                name = split.slice(Math.min(split.length - 1, 2)).join('.')
            }
            var appInfo = name + '@' + device.model
            var sdkVersion = 'v ' + device.weexVersion + ' - ' + device.platform + ' (inspector ' + device.devtoolVersion + ')'
            $('#app_info').innerHTML = appInfo
            $('#app_info').title = device.name + '@' + device.model
            $('#sdk_version').innerHTML = sdkVersion
            $('#remote_debug').checked = !!device.remoteDebug
            $('#network').checked = !!device.network
            $('#element_mode').value = device.elementMode || sessionStorage.getItem('elmentMode') || 'native'
            $('#log_level').value = device.logLevel || sessionStorage.getItem('logLevel') ||'debug'
            $('.info-ctn').style.display = 'inline-block'
            init()
            $('#remote_debug').onchange = function () {
                if (websocket.readyState === WebSocket.OPEN) {
                    websocket.send(JSON.stringify({method: 'WxDebug.' + (this.checked ? 'enable' : 'disable')}))
                }
            }
            $('#network').onchange = function () {
                if (websocket.readyState === WebSocket.OPEN) {
                    websocket.send(JSON.stringify({method: 'WxDebug.network', params: {enable: this.checked}}))
                }
            }
            $('#element_mode').onchange = function () {
                if (websocket.readyState === WebSocket.OPEN) {
                    sessionStorage.setItem('elmentMode', this.value);
                    websocket.send(JSON.stringify({method: 'WxDebug.setElementMode', params: {data: this.value}}))
                }
            }
            $('#log_level').onchange = function () {
                if (websocket.readyState === WebSocket.OPEN) {
                    sessionStorage.setItem('logLevel', this.value);
                    websocket.send(JSON.stringify({method: 'WxDebug.setLogLevel', params: {data: this.value}}))
                }
            }
            var bundleQrcodeCtn=$('#qrcode_bundle')
            bundleQrcodeCtn.innerHTML=''
            var bundles=message.params.bundles
            window._bundles=bundles
            if(bundles&&bundles.length>0) {

                bundles.forEach(function (url, i) {

                    var q = document.createElement('div')
                    q.innerHTML = '<p>' + new URL(url).pathname.split('/').slice(-1)[0] + '</p>'
                    q.className = 'bundle-qr'
                    bundleQrcodeCtn.appendChild(q)
                    new QRCode(q, {
                        text: url,
                        width: 150,
                        height: 150,
                        colorDark: "#000000",
                        colorLight: "#FFFFFF",
                        correctLevel: QRCode.CorrectLevel.L
                    });
                    q.onclick=function(){
                        websocket.send(JSON.stringify({method: 'WxDebug.refresh',params:{
                            bundleUrl:url
                        }}))
                    }
                })
                var qrcodeBtn=$('#qrcode_btn')
                var bundleQrcode=$('.bundle-qrcode')
                new QRCode(qrcodeBtn, {
                    text: '请点击',
                    width: 52,
                    height: 52,
                    colorDark: "#000000",
                    colorLight: "#E0E0E0",
                    correctLevel: QRCode.CorrectLevel.L
                });
                qrcodeBtn.style.visibility='visible'
                qrcodeBtn.onclick=function(){
                    bundleQrcode.style.display='block'
                }
                bundleQrcode.onclick=function(){
                    this.style.display='none'
                }
            }
            if (isProphetPageShowing) {
                websocket.send(JSON.stringify({method: 'WxDebug.enableTracing', params: {status: true}}));
            }
        }
        else {
            history.back();
        }
    }
    else if (message.method === 'WxDebug.prompt') {
        var delayed = 5000 + message.params.messageText.length / 6 * 1000
        toast(message.params.messageText.replace(/\n/g, '<br>'), delayed)
    }
    else if (message.method === 'WxDebug.reloadInspector') {
        $('#inspector').contentWindow.location.reload()
    }
    else if (message.method === 'WxDebug.reloadRuntime') {
        $('#runtime').contentWindow.websocket.ws.close()
        $('#runtime').contentWindow.location.reload()
    }
    else if (message.method === 'WxDebug.deviceDisconnect') {
        history.back();
    }
    else if(message.method==='WxDebug.bundleRendered'){
        var found=false
        $('#runtime').contentWindow.console.log(message)
        if(!message.params)found=true
        else {
            window._bundles&&window._bundles.forEach(function (url) {
                if (url === message.params.bundleUrl) {
                    found = true
                }
            })
        }
        if(found){
            $('.bundle-qrcode').style.display='none'
        }
    } else if (message.method === 'WxDebug.sendTracingData') {
        refreshProphetPage(message.params.data);
    } else if (message.method === 'WxDebug.sendSummaryInfo') {
        setSummaryInfo(message.params.summaryInfo);
    } else if (message.method === 'Page.startScreencast') {
        screencastParams = message.params;

        if (isProphetPageShowing) {
            websocket.send(JSON.stringify({method: 'Page.stopScreencast'}));
        }
    }
}
document.onkeydown = function (evt) {
    if (evt.key == 'r' && (evt.metaKey || evt.altKey) || evt.key == 'F5') {
        evt.preventDefault();
        if (hash === '#debugger') {
            $('#inspector').contentWindow.location.reload()
            $('#runtime').contentWindow.websocket.ws.close()
            $('#runtime').contentWindow.location.reload()
        }
        else {
            websocket.send(JSON.stringify({method: 'WxDebug.reload'}))
        }
        return false
    }
}
function init() {
    var $runtime = $('#runtime')
    $('#runtime').src = 'runtime.html?channelId=' + channelId
    $('#inspector').src = `/inspector/inspector.html?ws=${location.host}/debugProxy/inspector/${channelId}&remoteFrontend=1`
    var firstLoad=true
    $('#inspector').onload = function () {
        if(!firstLoad&&$('#remote_debug').checked){
            websocket.send(JSON.stringify({method: 'WxDebug.reload'}))
        }
        firstLoad=false
        $('#inspector').contentDocument.addEventListener('keydown' , function (evt) {
            if (evt.key == 'r' && (evt.metaKey || evt.altKey) || evt.key == 'F5') {
                $('#inspector').contentWindow.location.reload()
                $('#runtime').contentWindow.websocket.ws.close()
                $('#runtime').contentWindow.location.reload()
                evt.preventDefault()
                evt.stopPropagation()
                return false
            }
        },true)
    }
}
$help.onclick=function(){
    if($help.innerHTML==='?') {
        $help.innerHTML='x'
        $tipsMask.style.display='block'
        setTimeout(function(){
            $tipsMask.className+=' widget-anchor-show'
        },100)
    }
    else{
        $help.innerHTML='?'
        $tipsMask.className=$tipsMask.className.replace(/ widget-anchor-show/g,'')
        setTimeout(function(){
            $tipsMask.style.display='none'
        },400)
    }
}


$refreshBtn.onclick = function () {
    websocket.send(JSON.stringify({method: 'WxDebug.reload'}));
}

var notFirst = localStorage.getItem('notFirst')
if (notFirst!=2) {
    $help.onclick()
    localStorage.setItem('notFirst', '2')
}


function generatei18nTips(tip) {
    return gl_localeText[navigator.language || 'en-US'][tip];
}

new AnchorTips(document.querySelectorAll('.line.short>span:nth-child(1)')[0],AnchorTips.LEFT,generatei18nTips('JSDEBUG_TIP'),$('.tips-mask'))
new AnchorTips(document.querySelectorAll('.line.short>span:nth-child(1)')[1],AnchorTips.LEFT_BOTTOM,generatei18nTips('NETWORK_TIP'),$('.tips-mask'))
new AnchorTips(document.querySelectorAll('.line.middle>span:nth-child(1)')[0],AnchorTips.RIGHT,generatei18nTips('LOGLEVEL_TIP'),$('.tips-mask'))
new AnchorTips(document.querySelectorAll('.line.middle>span:nth-child(1)')[1],AnchorTips.RIGHT_BOTTOM,generatei18nTips('ELEMENT_MODE_TIP'),$('.tips-mask'))
