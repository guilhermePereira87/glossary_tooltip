(function ($, Drupal) {
  'use strict';

  Drupal.behaviors.glossaryTooltip = {
    attach: function (context) {
      if (document._glossaryTooltipInit) {
        return;
      }
      document._glossaryTooltipInit = true;

      if (!$.ui || !$.ui.tooltip) {
        return;
      }

      // Initialize delegated tooltip on document for items with `.glossary-tooltip`.
      $(document).tooltip({
        appendTo: 'body',
        items: '.glossary-tooltip',
        tooltipClass: 'glossary-tooltip-widget ui-tooltip',
        track: false,
        // Disable show/hide animations to avoid repositioning jitter after open.
        show: false,
        hide: false,
        position: {
          my: 'center bottom-8',
          at: 'center top',
          collision: 'fit flip',
          using: function (position, feedback) {
            const $tooltip = $(this);
            $tooltip.css(position);

            try {
              const tooltipLeft = position.left || $tooltip.offset().left || 0;
              const tooltipTop = position.top || $tooltip.offset().top || 0;
              const tooltipWidth = $tooltip.outerWidth() || 0;
              const tooltipHeight = $tooltip.outerHeight() || 0;

              let triggerCenter = null;
              let targetTop = null;

              if (feedback && feedback.target) {
                const t = feedback.target;
                triggerCenter = (t.left || 0) + ((t.width || 0) / 2);
                targetTop = t.top || 0;
              }
              else {
                const tooltipId = $tooltip.attr('id');
                let $target = tooltipId ? $('[aria-describedby="' + tooltipId + '"]') : $();
                if (!$target || !$target.length) {
                  $target = $(document.activeElement);
                }
                if ($target && $target.length) {
                  const to = $target.offset() || { left: 0, top: 0 };
                  triggerCenter = to.left + ($target.outerWidth() / 2 || 0);
                  targetTop = to.top || 0;
                }
              }

              if (triggerCenter !== null) {
                let arrowLeft = triggerCenter - tooltipLeft;
                const padding = 10;
                arrowLeft = Math.max(padding, Math.min(arrowLeft, Math.max(padding, tooltipWidth - padding)));
                $tooltip.css('--arrow-left', arrowLeft + 'px');
              }

              if (targetTop !== null) {
                if (tooltipTop + tooltipHeight <= targetTop + 2) {
                  $tooltip.removeClass('position-bottom').addClass('position-top');
                }
                else {
                  $tooltip.removeClass('position-top').addClass('position-bottom');
                }
              }
            }
            catch (e) {
            }
          }
        },
        content: function () {
          const $trigger = $(this);
          const desc = $trigger.attr('data-description') || $trigger.data('description') || '';
          const tid = $trigger.attr('data-tid') || $trigger.data('tid') || '';

          const $wrapper = $('<div class="glossary-tooltip-content"/>');
          const $summary = $('<div class="glossary-tooltip-summary"/>').html(desc);
          $wrapper.append($summary);

          if (tid) {
            const termUrl = '/taxonomy/term/' + encodeURIComponent(tid);
            const $readMore = $('<a class="glossary-tooltip-readmore" href="' + termUrl + '"><strong>Read more</strong> <span class="glossary-tooltip-icon" aria-hidden="true">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 5l7 7-7 7M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              '</span></a>');
            $readMore.hide();
            $wrapper.append($readMore);
          }

          return $wrapper;
        },
        open: function (event, ui) {
          try {
            const $tooltip = ui.tooltip;
            const $summary = $tooltip.find('.glossary-tooltip-summary');
            const $readMore = $tooltip.find('.glossary-tooltip-readmore');
            if ($summary.length && $readMore.length) {
              let lineHeight = parseFloat($summary.css('line-height'));
              if (!lineHeight || isNaN(lineHeight)) {
                const fontSize = parseFloat($summary.css('font-size')) || 12;
                lineHeight = fontSize * 1.2;
              }

              const maxLines = 3;
              const maxH = Math.round(lineHeight * maxLines);

              if ($summary[0].scrollHeight > maxH + 1) {
                $readMore.show();
              }
              else {
                $readMore.hide();
              }
            }
          }
          catch (e) {
            // ignore
          }
        }
      });

      $(document).on('click', '.glossary-tooltip', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const $this = $(this);

        if ($this.data('glossaryTooltipOpen')) {
          try {
            $this.tooltip('close');
            $this.tooltip('destroy');
          }
          catch (err) {
            // ignore
          }
          $this.removeData('glossaryTooltipOpen');
          return;
        }

        $('.glossary-tooltip').filter(function () { return $(this).data('glossaryTooltipOpen'); }).each(function () {
          try {
            $(this).tooltip('close');
            $(this).tooltip('destroy');
          }
          catch (err) {}
          $(this).removeData('glossaryTooltipOpen');
        });

        const docInstance = $(document).tooltip('instance');
        const contentFn = docInstance && docInstance.options && docInstance.options.content ? docInstance.options.content : null;
        const positionOpt = docInstance && docInstance.options && docInstance.options.position ? docInstance.options.position : {
          my: 'center bottom-8', at: 'center top', collision: 'fit flip'
        };

        $this.tooltip({
          appendTo: 'body',
          tooltipClass: 'glossary-tooltip-widget ui-tooltip',
          track: false,
          show: false,
          hide: false,
          position: positionOpt,
          content: function () {
            return contentFn ? contentFn.call(this) : '';
          },
          open: docInstance && docInstance.options && docInstance.options.open ? docInstance.options.open : function () {}
        });

        $this.data('glossaryTooltipOpen', true);
        try {
          $this.tooltip('open');
        }
        catch (err) {
          // ignore
        }
      });

      $(document).on('click', function (e) {
        if (!$(e.target).closest('.glossary-tooltip-widget, .glossary-tooltip').length) {
          $('.glossary-tooltip[aria-describedby]').each(function () { $(this).trigger('mouseleave').trigger('focusout'); });
        }
      });
    }
  };

})(jQuery, Drupal);
