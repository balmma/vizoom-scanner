ROOT = 'http://vizoom.smss.ch/_rest/';

var json = null;
var secret = null;
var username = null;
var password = null;

var selected_event = null;

$( document ).bind( "mobileinit", function() {  
  $.support.cors = true;
  $.mobile.allowCrossDomainPages = true;
  $.mobile.defaultPageTransition = 'fade';
  $.mobile.touchOverflowEnabled = true;  
});

var fixgeometry = function() {  
  scroll(0, 0);  
  var viewport_height = $(window).height();   
  $("div#scan").css('min-height', viewport_height+'px');
  $("div#settings").css('min-height', viewport_height+'px');
  $("div#verify_dialog").css('min-height', viewport_height+'px');
};

var reset_view = function(){  
  $('body').removeClass('guest friend denied');
  $('#user_info').html(''); 
};

$(document).ready(function() {  
  //$(window).bind('orientationchange resize pageshow', fixgeometry);
  //$(window).bind('pageshow', reset_view);  
});

document.addEventListener("deviceready", function(){
  document.addEventListener("backbutton", navigator.app.exitApp, false);
}, false);

function time_string(time){
  var now = new Date();
  time = new Date(time);
  text = '';
  if(time.getDate() == now.getDate() && time.getMonth() == now.getMonth() && time.getFullYear() == now.getFullYear()){
    text = 'heute';
  }else{
    text = 'am ' + time.getDate()+'.'+time.getMonth()+'.'+time.getFullYear();
  }
  text = text + ' um '+ time.getHours() + ':' + time.getMinutes();
  return text; 
}

function update_user_data(){
  if(json){
    var user = json.user;
    var text = '<p><label>Name:</label>'+user.firstname+' '+user.surname+'</p><p><label>E-Mail:</label>'+user.email+'</p><p><label>Geburtstag:</label>'+user.birthday+'</p><p><label>Alter:</label>'+user.age+'</p>';
    if(json.status == 'confirmed_as_guest'){
      text = text + '<h2>Gast -> Kostenloser Eintritt</h2>';
    }else if(json.status == 'confirmed_as_guest'){
      text = text + '<h2>Gast</h2><h2>Kostenloser Eintritt</h2>';
      $('body').addClass('guest');
    }else if(json.status == 'confirmed_as_friend'){
      text = text + '<h2>Friend</h2><h2>Eintritt '+json.price.toFixed(2)+'</h2>';
      $('body').addClass('friend');
    }else if(json.status == 'entered_as_guest'){               
      text = text + '<h2>Bereits validiert als Gast '+time_string(json.entry_time)+'</h2><h2>Kostenloser Eintritt</h2>';
      $('body').addClass('guest');
    }else if(json.status == 'entered_as_friend'){
      var entry_time = new Date(Date.parse(json.entry_time));      
      text = text + '<h2>Bereits validiert als Friend '+time_string(json.entry_time)+'</h2><h2>Eintritt '+json.price.toFixed(2)+'</h2>';
      $('body').addClass('friend');
    }else{
      text = text + '<h2>Auf keiner Liste</h2>';
      $('body').addClass('denied');
    }
    $('#user_info').html(text);
  }
}

function update_verify_user_data(user){
  var text = '<p><label style="display:inline-block;width:100px;">Name:</label>'+user.firstname+' '+user.surname+'</p>';
  text = text + '<p><label style="display:inline-block;width:100px;">Geburtstag:</label>'+user.birthday+'</p>';
  text = text + '<p><label style="display:inline-block;width:100px;">Strasse:</label>'+user.street+'</p>';
  text = text + '<p><label style="display:inline-block;width:100px;">Ort:</label>'+user.zip+' '+user.city+'</p>';
  text = text + '<p><label style="display:inline-block;width:100px;">Mobile:</label>'+user.mobile+'</p>';
  $('#verify_user_info').html(text);
}

function scan() {
    
  if(window.BarcodeScanner){
    new BarcodeScanner().scan(function(result) {
      try
      {               

        reset_view();

        alert(selected_event.name);
        
        alert(result.text);

        var code = $.base64.decode(result.text);

        alert(code);

        alert(code.length);
        
        code = decrypt_code(code,selected_event.key_n,selected_event.key_e);
        
        alert(code);

        var token = code.split(',');
        if(token.length == 9){
          var data = {
            participation_id: token[0],
            event_id: token[1],
            type: token[2],
            status: token[3],
            surname: token[4],
            firstname: token[5],
            citycode: token[6],
            city: token[7],
            birthday: token[8] && token[8].length > 0 ? moment(token[8],'DD-MM-YYYY') : null
          };
          process_data(data);
        
        }else {
          show_code_invalid();
        }
      }catch(e){
          alert(e);
      }       
    });         
  }else {
    //process_secret("18y6fuhum8","Balmer","Matthias");
  }  
}

function show_code_invalid(){
  $('body').addClass('denied');
  $('#user_info').html("<h2>Kein gültiger Code</h2>"); 
}

function process_data(data){
  alert(JSON.stringify(data));
  // if(secret && surname && firstname){
  //   $('#user_info').html('Loading data for '+ firstname + ' ' + surname + ' ...'); 
    
  //   request('PUT',ROOT+'participation/validate',{'user_secret': secret,'event_id': event_id},function(res){
  //     json = res;
  //     var user = json.user;
  //     if(user){
  //       update_verify_user_data(user);  
  //       $.mobile.changePage('#verify_dialog', 'pop', true, true);
  //     }else{         
  //       show_code_invalid();   
  //     }
             
  //   });
  // }else{
  //   show_code_invalid();    
  // }
  setTimeout(fixgeometry,500);
}

function verify(){  
  var user = json.user;
  if(!user.identity_verified){
    request('PUT',ROOT+'user/verify',{'user_secret': secret});
  }
  setTimeout(update_user_data,500);  
}

function login(u,p){
  username = u;
  password = p;
  request('GET',ROOT+'check_login',{},function(res){show_events();},function(res){$('#login_status').html("Ungültiges Login");});     
}

function request(type,url,data,success,error){
  $.ajax({
    type: type,
    url: url,
    data: data,
    dataType: 'json',
    headers: {'Authorization': 'Basic ' + $.base64.encode(username + ':' + password)},
    success: success,
    error: error
  });
}

function show_events(){
  request('GET',ROOT+'validator/events',{},function(res){
    var list = $("#event_list");
    _.each(res,function(ev){
      var list_event = ev;
      list.append('<li id="'+list_event.id+'"><h3>'+list_event.name+'</h3><p>'+list_event.start_time+'</p></li>');
      $('#'+list_event.id).click(function(){
        selected_event = list_event;        
        $('#event_title').html(selected_event.name);        
        $.mobile.changePage('#scan', 'fade', true, true);
      });
    });    
    $.mobile.changePage('#select_event', 'fade', true, true);
  }); 
}

function hex2bin(hex)
{
  var bytes = [], str;

  for(var i=0,il=hex.length-1; i<il; i+=2)
      bytes.push(parseInt(hex.substr(i, 2), 16));

  return String.fromCharCode.apply(String, bytes);    
}

function bin2hex (bin)
{
  var i = 0, l = bin.length, chr, hex = '';
  for (i; i < l; ++i)
  {
    chr = bin.charCodeAt(i).toString(16);
    hex += chr.length < 2 ? '0' + chr : chr;
  }
  return hex;
}

function decrypt_code(encrypted_code,n,e){

  var rsa = new RSAKey();      
  rsa.setPublic(n,e);

  encrypted_code = bin2hex(encrypted_code);
       
  var decrypted_code = rsa.doPublic(parseBigInt(encrypted_code,16));
      
  // remove padding
  decrypted_code = decrypted_code.toString(16).replace(/^1f+00/, '');
  
  return hex2bin(decrypted_code);   
}


