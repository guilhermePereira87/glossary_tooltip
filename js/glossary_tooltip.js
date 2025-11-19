/**
 * Glossary Tooltip init using jQuery UI Tooltip.
 * Uses the element's `data-description` attribute as HTML content.
 */
(function ($, Drupal) {
  'use strict';

  Drupal.behaviors.glossaryTooltip = {
    attach: function (context) {
      if (!$.ui || !$.ui.tooltip) {
        return;
      }

      $(document).tooltip({
        items: '.glossary-tooltip',
        track: false,
        tooltipClass: 'glossary-tooltip-widget',
        position: {
          my: 'center bottom+10',
          at: 'center top',
          collision: 'flipfit'
        },
        content: function () {
          var $trigger = $(this);
          var desc = $trigger.attr('data-description') || $trigger.data('description') || '';
          var tid = $trigger.attr('data-tid') || $trigger.data('tid') || '';

          var $wrapper = $('<div class="glossary-tooltip-content"/>');
          var $summary = $('<div class="glossary-tooltip-summary"/>');
          $summary.html(desc);
          $wrapper.append($summary);

          if (tid) {
            var termUrl = '/taxonomy/term/' + encodeURIComponent(tid);
            var $readMore = $('<a class="glossary-tooltip-readmore" href="' + termUrl + '">Read more <span class="glossary-tooltip-icon" aria-hidden="true">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 5l7 7-7 7M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              '</span></a>');
            $readMore.hide();
            $wrapper.append($readMore);
          }

          return $wrapper;
        },
        show: { delay: 120 },
        hide: { delay: 80 },
        open: function (event, ui) {
          if (!ui || !ui.tooltip || !event) {
            return;
          }
          var $tooltip = ui.tooltip;
          var $target = $(event.originalEvent && event.originalEvent.target) || $(event.target);

          try {
            var targetOffset = $target.offset();
            var tooltipOffset = $tooltip.offset();
              if (tooltipOffset && targetOffset) {
                if (tooltipOffset.top < targetOffset.top) {
                  $tooltip.addClass('position-top').removeClass('position-bottom');
                }
                else {
                  $tooltip.addClass('position-bottom').removeClass('position-top');
                }

                // Compute arrow horizontal position so the arrow points to the
                // center of the trigger word (arrow 'exits' from the word).
                try {
                  var targetCenter = targetOffset.left + ($target.outerWidth() / 2);
                  var tooltipLeft = tooltipOffset.left;
                  var arrowLeft = targetCenter - tooltipLeft;
                  // Constrain within tooltip bounds (10px padding)
                  arrowLeft = Math.max(10, Math.min(arrowLeft, $tooltip.outerWidth() - 10));
                  $tooltip.css('--arrow-left', arrowLeft + 'px');
                }
                catch (e) {
                  // ignore
                }
              }
          }
          catch (e) {
            // ignore
          }

          var $summary = $tooltip.find('.glossary-tooltip-summary');
          var $readMore = $tooltip.find('.glossary-tooltip-readmore');
          if ($summary.length && $readMore.length) {
            if ($summary[0].scrollHeight > $summary.innerHeight()) {
              $readMore.show();
            }
            else {
              $readMore.hide();
            }
          }
        }
      });
    }
  };

})(jQuery, Drupal);
