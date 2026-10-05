// JavaScript Document
// VUL-14 (CSRF): se envía el token (leído del <meta name="csrf-token">) en cada
// petición AJAX, por cabecera X-CSRF-Token y también como parámetro csrf_token.

function csrfToken() {
  var m = document.querySelector('meta[name="csrf-token"]');
  return m ? m.getAttribute('content') : '';
}

$(document).ready(function(){
   $.ajaxSetup({ headers: { 'X-CSRF-Token': csrfToken() } });

   $('.button').click(function(){
     agregaritems($(this).attr('id'));
   });

   $('.elim').click(function(){
      eliminaritems($(this).attr('id'));
    });
    $('.limpiar').click(function(){
      eliminartodo();
    });
 });

function agregaritems(id)
{
	$.ajax({
            type: "POST",
            url: 'carrito.php',
            data: "op=1&csrf_token="+encodeURIComponent(csrfToken())+"&iditems="+id,
            success: function(response)
            {
				$('#myModal').modal('show');
            }
       });
}

function eliminaritems(pos)
{
	$.ajax({
            type: "POST",
            url: 'carrito.php',
            data: "op=2&csrf_token="+encodeURIComponent(csrfToken())+"&pos="+pos,
            success: function(response)
            {
				location.reload();
            }
       });
}

function eliminartodo()
{
	$.ajax({
            type: "POST",
            url: 'carrito.php',
            data: "op=3&csrf_token="+encodeURIComponent(csrfToken()),
            success: function(response)
            {
				location.reload();
            }
       });
}
