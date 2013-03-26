ROOT = 'http://vizoom.smss.ch/_rest/';

var json = null;
var secret = null;
var event_id = null;
var username = null;
var password = null;

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
  var secret = "18y6fuhum8"
  
  if(window.BarcodeScanner){
    new BarcodeScanner().scan(function(result) {
      reset_view();
      var token = result.text.split(';');
      var surname = token[0];
      var firstname = token[1];
      var secret = token[2];

      process_secret(secret,surname,firstname);
    });         
  }else {
    process_secret("18y6fuhum8","Balmer","Matthias");
  }  
}

function process_secret(secret,surname,firstname){
  if(secret && surname && firstname){
    $('#user_info').html('Loading data for '+ firstname + ' ' + surname + ' ...'); 
    
    request('PUT',ROOT+'participation/validate',{'user_secret': secret,'event_id': event_id},function(res){
      json = res;
      var user = json.user;
      if(user){
        update_verify_user_data(user);  
        $.mobile.changePage('#verify_dialog', 'pop', true, true);
      }else{         
        $('body').addClass('denied');
        $('#user_info').html("<h2>Kein gültiger Code</h2>");   
      }
             
    });
  }else{
    $('body').addClass('denied');
    $('#user_info').html("<h2>Kein gültiger Code</h2>");     
  }
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
    jQuery.each(res,function(index){
      var event = res[index];
      list.append('<li id="'+event.id+'"><h3>'+event.name+'</h3><p>'+event.start_time+'</p></li>');
      $('#'+event.id).click(function(){
        event_id = event.id;
        $('#event_title').html(event.name);
        $.mobile.changePage('#scan', 'fade', true, true);
      });
    });    
    $.mobile.changePage('#select_event', 'fade', true, true);
  }); 
}


