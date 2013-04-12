ROOT = 'http://vizoom.smss.ch/_rest/';

var secret = null;
var username = null;
var password = null;

var selected_event = null;

var participation_data = null;

var STATUSES = {
  0: "canceled",
  1: "invited",
  2: "declined",
  3: "confirmed",
  4: "entered",
  5: "paid"
}

var TYPES = {
  1: "friend",
  2: "guest"
}

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
  try{
    if(participation_data){
      var text = '<p><label>Name:</label>'+participation_data.firstname+' '+participation_data.surname+'</p><p><label>Geburtstag:</label>'+(participation_data.birthday ? participation_data.birthday.format('DD.MM.YYYY') : 'unbekannt')+'</p><p><label>Alter:</label>'+(participation_data.age || 'unbekannt')+'</p>';
      if(participation_data.status == 'confirmed' && participation_data.type == 'guest'){
        text = text + '<h2>Gast</h2><h2>Kostenloser Eintritt</h2>';
        $('body').addClass('guest');
      }else if(participation_data.status == 'confirmed' && participation_data.type == 'friend'){
        text = text + '<h2>Friend</h2><h2>Eintritt '+ ((selected_event.price - selected_event.friend_discount).toFixed(2)) +'</h2>';
        $('body').addClass('friend');
      }else{
        $('body').addClass('denied');
        $('#user_info').html('<h2>Auf keiner Liste.</h2><h2>Einlass verweigern!</h2>');
      }
      $('#user_info').html(text);
    }
  }catch(ex){
    alert(ex);
  }
}

function calculate_age(){

}

function update_verify_user_data(){
  var text = '<p><label style="display:inline-block;width:100px;">Name:</label>'+participation_data.firstname+' '+participation_data.surname+'</p>';
  text = text + '<p><label style="display:inline-block;width:100px;">Geburtstag:</label>'+(participation_data.birthday ? participation_data.birthday.format('DD.MM.YYYY') : 'unbekannt')+'</p>';
  text = text + '<p><label style="display:inline-block;width:100px;">Ort:</label>'+participation_data.citycode+' '+participation_data.city+'</p>';
  $('#verify_user_info').html(text);
}

function init_scanner(){
  new BarcodeScanner().scan(function(result) {
    var data = $.base64.decode(result.text);
    var tokens = data.split(',');
    if(tokens.length == 9){
      selected_event = {
        id: tokens[0],
        name: tokens[1],
        start_time: tokens[2],
        end_time: tokens[3],
        min_age: tokens[4],
        price: tokens[5],
        friend_discount: tokens[6],
        key_n: tokens[7],
        key_e: tokens[8]
      }
      $('#event_title').html(selected_event.name);        
      $.mobile.changePage('#scan', 'fade', true, true);
    }
  });
}

function scan() {
    
  if(window.BarcodeScanner){
    new BarcodeScanner().scan(function(result) {
      try
      {               

        reset_view();

        var code = $.base64.decode(result.text);
               
        code = decrypt_code(code,selected_event.key_n,selected_event.key_e);

        var tokens = code.split(',');
        if(tokens.length == 10){
          participation_data = {
            participation_id: tokens[0],
            event_id: tokens[1],
            type: TYPES[tokens[2]],
            status: STATUSES[tokens[3]],
            surname: tokens[4],
            firstname: tokens[5],
            citycode: tokens[6],
            city: tokens[7],
            birthday: tokens[8] && tokens[8].length > 0 ? moment(tokens[8],'DD-MM-YYYY') : null,
            age: tokens[9] && tokens[9].length > 0 ? parseInt(tokens[9],10) : null
          };
          process_participation_data();
        
        }else {
          show_code_invalid();
        }
      }catch(e){
          show_code_invalid(e);
      }       
    });         
  }else {
    //process_secret("18y6fuhum8","Balmer","Matthias");
  }  
}

function show_code_invalid(message){
  $('body').addClass('denied');
  var text = '<h2>Kein gültiger Code</h2>';
  if(message){
    text = text + '\n<h3>' + message + '</h3>'
  }
  $('#user_info').html(text); 
}

function process_participation_data(){
  
  if(participation_data.status == 'confirmed' || participation_data.status == 'entered' || participation_data.status == 'paid'){
    update_verify_user_data();
    $.mobile.changePage('#verify_dialog', 'pop', true, true);
  } else {
    $('body').addClass('denied');
    $('#user_info').html('<h2>Auf keiner Liste.</h2><h2>Einlass verweigern!</h2>');
  }

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
  // var user = json.user;
  // if(!user.identity_verified){
  //   request('PUT',ROOT+'user/verify',{'user_secret': secret});
  // }
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


