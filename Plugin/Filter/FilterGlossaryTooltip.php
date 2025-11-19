<?php

namespace Drupal\glossary_tooltip\Plugin\Filter;

use Drupal\Component\DependencyInjection\ContainerInterface;
use Drupal\filter\FilterProcessResult;
use Drupal\filter\Plugin\FilterBase;

/**
 * @Filter(
 *   id = "filter_glossary_tooltip",
 *   title = @Translation("Glossary Tooltip Filter"),
 *   description = @Translation("Adds glossary term tooltips to text."),
 *   type = Drupal\filter\Plugin\FilterInterface::TYPE_MARKUP_LANGUAGE,
 * )
 */
class FilterGlossaryTooltip extends FilterBase {

  /**
   * The glossary tooltip manager service.
   *
   * @var \Drupal\glossary_tooltip\Service\GlossaryTooltipManagerInterface
   */
  protected $glossaryTooltipManager;

  /**
   * Constructs a FilterGlossaryTooltip object.
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, \Drupal\glossary_tooltip\Service\GlossaryTooltipManagerInterface $glossary_tooltip_manager) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
    $this->glossaryTooltipManager = $glossary_tooltip_manager;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('glossary_tooltip.manager')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function process ($text, $langcode) {
    $map = $this->glossaryTooltipManager->getGlossaryTermMap($langcode);

    if (empty($map)) {
      return new FilterProcessResult($text);
    }

    $terms = array_keys($map);
    // To avoid partial matches, sort terms by length descending.
    usort($terms, function($a, $b) {
      return mb_strlen($b) <=> mb_strlen($a);
    });

    $escapedTerms = array_map(function($term) {
      return preg_quote($term, '/');
    }, $terms);

    // Use DOMDocument to safely manipulate HTML.
    $doc = new \DOMDocument();
    $wrapped = '<?xml encoding="utf-8"?>' . $text;
    @$doc->loadHTML($wrapped, LIBXML_HTML_NOIMPLIED |LIBXML_HTML_NODEFDTD);

    $xpath = new \DOMXPath($doc);
    // Find all text nodes that aren't empty.
    $nodes = $xpath->query('//text()[normalize-space(.) != ""]');

    // Tags to skip.
    $tagsToSkip = ['a', 'script', 'style', 'textarea'];

    foreach ($nodes as $node) {
      $parent = $node->parentNode;
      if (!$parent) {
        continue;
      }

      $parentTag = strtolower($parent->nodeName);
      if (in_array($parentTag, $tagsToSkip, TRUE)) {
        continue;
      }

      $originalText = $node->nodeValue;

      // Build the regex pattern.
      $pattern = '/(?<!\p{L})(' . implode('|', $escapedTerms) . ')(?!\p{L})/iu';

      $replacedText = preg_replace_callback(
        $pattern,
        function ($matches) use ($map) {
          $matchedText = $matches[0];
          $key = mb_strtolower(trim($matchedText));
          if (empty($map[$key])) {
            return $matchedText;
          }
          $entry = $map[$key];
          $label = htmlspecialchars(
            $entry['label'],
            ENT_QUOTES | ENT_SUBSTITUTE,
            'UTF-8'
          );
          $description = htmlspecialchars(
            $entry['description'] ?? '',
            ENT_QUOTES | ENT_SUBSTITUTE,
            'UTF-8'
          );
          return '<span class="glossary-tooltip" data-tid="' . $entry['tid'] . '" data-description = "' . $description . '">' . $label . '</span>';
        }, $originalText);

        // If modified, replace the text node with the new fragment (html).
        if ($replacedText !== $originalText) {
          $fragment = $doc->createDocumentFragment();
          @$fragment->appendXML($replacedText);
          if ($fragment) {
            $parent->replaceChild($fragment, $node);
          }
        }
    }

    $html = $doc->saveHTML();
    $result = new FilterProcessResult($html);

    // Add cache tags per term so Drupal invalidates de cache when terms are updated.
    $tags = [];
    foreach ($map as $entry) {
      if (!empty($entry['tid'])) {
        $tags[] = 'taxonomy_term:' . $entry['tid'];
      }
    }
    if (!empty($tags)) {
      $result->addCacheTags($tags);
    }

    // Attach JS so tooltips works front-end.
    $result->setAttachments([
      'library' => [
        'glossary_tooltip/glossary_tooltip',
      ],
    ]);
    return $result;
  }

}
