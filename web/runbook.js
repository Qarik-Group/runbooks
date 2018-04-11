;(function ($, document, window, undefined) {
  var $m = $('#m');
  var _m = $('<div>');
  var link = '<svg width="24" height="22" version="1.1" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z"/></svg>';

  var ss = undefined;
  $.each($m.children(), function (i, e) {
    if ($(e).is('h2')) {
      if (ss) { _m.append(ss); }
      ss = $('<div class="ss">');

      var $e = $(e);
      var t = $e.text().toLowerCase()
                       .replace(/[^a-z0-9]+/g, '-');
      $e.attr('id', t);
      $e.prepend($('<a class="lnk" href="#'+t+'">'+link+'</a.'));
      _m.append($e);
    } else if (ss) {
      ss.append(e)
    } else {
      _m.append(e);
    }
  });
  if (ss.children().length > 0) {
    _m.append(ss);
  }
  $m.empty();
  $.each(_m.children(), function (i, e) {
    $m.append(e);
  });

  $(document)
    .on('click', '#m > h2', function (event) {
      console.log($(event.target));
      if ($(event.target).is('h2')) {
        event.preventDefault();
        $(event.target).next('.ss').slideToggle();

      } else {
        $(event.target).closest('h2').next('.ss').show();
      }
    });

  if (document.location.hash != "") {
    $('#m > h2'+document.location.hash).next('.ss').show();
  }
})(jQuery, document, window);
