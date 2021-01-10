export const getUserBrowser = () => {
    const userAgent = navigator.userAgent
    try {
        const isOpera = (!!window.opr && !!window.opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;

        // Firefox 1.0+
        const isFirefox = typeof InstallTrigger !== 'undefined';
    
        // Safari 3.0+ "[object HTMLElementConstructor]" 
        const isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === '[object SafariRemoteNotification]'; })(!window[ 'safari' ] || (typeof safari !== 'undefined' && window[ 'safari' ].pushNotification));
    
        // Internet Explorer 6-11
        const isIE = /*@cc_on!@*/false || !!document.documentMode;
    
        // Edge 20+
        const isEdge = !isIE && !!window.StyleMedia;
    
        // Chrome 1 - 79
        const isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);
    
        // Edge (based on chromium) detection
        const isEdgeChromium = isChrome && (navigator.userAgent.indexOf('Edg') != -1);
    
        // Blink engine detection
        const isBlink = (isChrome || isOpera) && !!window.CSS;

        return {
            ...isOpera ? { isOpera } : {},
            ...isFirefox ? { isFirefox } : {},
            ...isSafari ? { isSafari } : {},
            ...isIE ? { isIE } : {},
            ...isChrome ? { isChrome } : {},
            ...isEdgeChromium ? { isEdgeChromium } : {},
            ...isBlink ? { isBlink } : {},
            userAgent
        }
    } catch (error) {
        console.log(error);
        return {
            userAgent
        }
    }
}

export const parseFiles = files => {
    return Object.assign({}, files.map(fileData => {
        return {
            ...fileData.errors ? { errors: Object.assign({}, fileData.errors) } : {},
            file: fileData.file ? {
                name: fileData.file.name,
                size: `${ fileData.file.size / 1000 / 1000 }MB`,
                type: fileData.file.type
            } : {}
        }
    }))
}