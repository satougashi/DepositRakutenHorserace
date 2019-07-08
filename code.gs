cookie = {}; // クッキー情報ぐらいグローバルでもええよね？

// Set-Cookieからクッキー情報を取得してオブジェクトへ格納
function setCookie(response) {
  if(!("Set-Cookie" in response.getAllHeaders())) {
    return;
  }
  var setcookie = response.getAllHeaders()["Set-Cookie"];
  for(var i = 0; i < setcookie.length; i ++){
    var temp = setcookie[i].split(";")[0];
    temp = temp.split("=");
    cookie[temp[0]] = temp[1];
  }
}

// 保存してあるクッキー情報を文字列へ
function getCooikeString() {
  cookies = [];
  Object.keys(cookie).forEach(function (k) {
    cookies.push(k + '=' + cookie[k]);
  });
  return cookies.join('; ');
}


// POSTを送信
function postRequestWithCookie(URL, formData) {
  var params = {
    method : "post",
    followRedirects: false,
    payload : formData,
    headers: {
      'Cookie': getCooikeString(),
    }
  };
  var response = UrlFetchApp.fetch(URL, params);
  setCookie(response); // cookieにデータ保存
  return response;
  
}

// GETを送信
function getRequestWithCookie(URL) {
  var params = {
    method : "get",
    followRedirects: false,
    headers: {
      'Cookie': getCooikeString(),
    }
  };
  var response = UrlFetchApp.fetch(URL, params);
  setCookie(response); // cookieにデータ保存
  return response;
}

// htmlからtokenを探して取得する
function getToken(contentText) {
  var TOLEN_REG = /<input type="hidden" name="_token" value="(.+)">/;
  return contentText.match(TOLEN_REG)[0].replace(TOLEN_REG, RegExp.$1);
  
}

function main(){
  try{
    // ログイン情報
    var loginForm = {
      'service_id': 'n58',
      'return_url': '/login?return_url=%2Flogin%2Fredirect%3Fm%3Di%26r%3Dhttps%253A%252F%252Fkeiba.rakuten.co.jp%252F',
      'u': PropertiesService.getScriptProperties().getProperty("LOGIN_ID"),
      'p': PropertiesService.getScriptProperties().getProperty("LOGIN_PASS"),
      'submit': 'ログイン',
      'pp_version': '20170213',
      'device_fp': '7f3a18915c8ed68fd3022f4648ad0c09',
      'time_zone': '-540',
      'os_info': 'Win32'  
    }
    var LOGIN_URL = 'https://grp02.id.rakuten.co.jp/rms/nid/logini'; // 競馬ログインURL
    var response = postRequestWithCookie(LOGIN_URL, loginForm); // loginフォームを送信
    
    // リダイレクト処理その1（https://bet.keiba.rakuten.co.jp/loginへ）
    response = getRequestWithCookie(response.getAllHeaders()['Location']);  
    
    // リダイレクト処理その2（https://my.keiba.rakuten.co.jp/login/redirectへ）
    response = getRequestWithCookie(response.getAllHeaders()['Location']);
    
    // 入金URLへ行き、トークンを取得する
    var DEPOSIT_URL = "https://bet.keiba.rakuten.co.jp/bank/deposit";
    response = getRequestWithCookie(DEPOSIT_URL);
    
    var depositForm = {
      _token: getToken(response.getContentText()),
      price: '100', // 100円入金
      notify: '1' // 通知なし
    }
    // 入金
    response = postRequestWithCookie(DEPOSIT_URL, depositForm); 
    
    // リダイレクト処理その3（確認画面へ）
    response = getRequestWithCookie(response.getAllHeaders()['Location']);
    
    var confirmForm = {
      _token: getToken(response.getContentText()),
      mode: 'execute',
      pin: PropertiesService.getScriptProperties().getProperty("PIN"),
    }
    
    // 確認
    var CONFIRM_URL = "https://bet.keiba.rakuten.co.jp/bank/deposit/confirm";
    response = postRequestWithCookie(CONFIRM_URL, confirmForm); 
    
    // リダイレクト処理その4（処理完了画面へ）
    response = getRequestWithCookie(response.getAllHeaders()['Location']);
    Logger.log(response.getContentText());
  }catch(e) {
    MailApp.sendEmail(PropertiesService.getScriptProperties().getProperty("E_MAIL"), 'GASこけたよ', e);
  }
}
