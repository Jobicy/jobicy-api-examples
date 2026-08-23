<?php
if (!defined('ABSPATH')) {
    exit;
}

final class Jobicy_Remote_Jobs_Shortcode
{
    private Jobicy_Remote_Jobs_Api_Client $client;
    private string $stylesheet;

    public function __construct(Jobicy_Remote_Jobs_Api_Client $client, string $stylesheet)
    {
        $this->client = $client;
        $this->stylesheet = $stylesheet;
    }

    public function register(): void
    {
        add_shortcode('jobicy_jobs', [$this, 'render']);
    }

    public function render($attributes = []): string
    {
        $attributes = shortcode_atts([
            'count' => '10',
            'geo' => '',
            'industry' => '',
            'tag' => '',
        ], (array) $attributes, 'jobicy_jobs');

        $filters = [
            'count' => min(100, max(1, absint($attributes['count']))),
            'geo' => sanitize_key($attributes['geo']),
            'industry' => sanitize_key($attributes['industry']),
            'tag' => sanitize_text_field($attributes['tag']),
        ];

        wp_enqueue_style('jobicy-remote-jobs-widget', $this->stylesheet, [], '1.0.0');
        $result = $this->client->get_jobs($filters);
        ob_start();
        ?>
        <section class="jobicy-widget" aria-label="<?php echo esc_attr__('Remote jobs', 'jobicy-remote-jobs-widget'); ?>">
            <?php if (empty($result['jobs'])) : ?>
                <p class="jobicy-widget__empty"><?php echo esc_html($result['error'] ? __('Remote jobs are temporarily unavailable.', 'jobicy-remote-jobs-widget') : __('No matching remote jobs found.', 'jobicy-remote-jobs-widget')); ?></p>
            <?php else : ?>
                <div class="jobicy-widget__list">
                    <?php foreach (array_slice($result['jobs'], 0, $filters['count']) as $job) : ?>
                        <article class="jobicy-widget__job">
                            <h3 class="jobicy-widget__title">
                                <a href="<?php echo esc_url($job['url']); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html($this->text($job['jobTitle'] ?? __('Remote opportunity', 'jobicy-remote-jobs-widget'))); ?></a>
                            </h3>
                            <p class="jobicy-widget__meta">
                                <span><?php echo esc_html($this->text($job['companyName'] ?? __('Company not specified', 'jobicy-remote-jobs-widget'))); ?></span>
                                <span><?php echo esc_html($this->text($job['jobGeo'] ?? __('Location not specified', 'jobicy-remote-jobs-widget'))); ?></span>
                            </p>
                            <?php $salary = $this->salary($job); ?>
                            <?php if ($salary !== '') : ?>
                                <p class="jobicy-widget__salary"><?php echo esc_html($salary); ?></p>
                            <?php endif; ?>
                            <?php if (!empty($job['jobExcerpt'])) : ?>
                                <p class="jobicy-widget__excerpt"><?php echo esc_html(wp_trim_words($this->text($job['jobExcerpt']), 35, '…')); ?></p>
                            <?php endif; ?>
                            <a class="jobicy-widget__link" href="<?php echo esc_url($job['url']); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html__('View job', 'jobicy-remote-jobs-widget'); ?></a>
                        </article>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
            <p class="jobicy-widget__attribution"><a href="<?php echo esc_url('https://jobicy.com/'); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html__('Jobs powered by Jobicy', 'jobicy-remote-jobs-widget'); ?></a></p>
        </section>
        <?php
        return (string) ob_get_clean();
    }

    private function text($value): string
    {
        return html_entity_decode(wp_strip_all_tags((string) $value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    private function salary(array $job): string
    {
        $minimum = isset($job['salaryMin']) ? (float) $job['salaryMin'] : 0.0;
        $maximum = isset($job['salaryMax']) ? (float) $job['salaryMax'] : 0.0;

        if ($minimum <= 0 && $maximum <= 0) {
            return '';
        }

        $currency = isset($job['salaryCurrency']) && preg_match('/^[A-Z]{3}$/i', (string) $job['salaryCurrency'])
            ? strtoupper((string) $job['salaryCurrency'])
            : 'USD';
        $amount = $minimum > 0 && $maximum > 0 && $minimum !== $maximum
            ? number_format_i18n($minimum) . '–' . number_format_i18n($maximum)
            : number_format_i18n($minimum > 0 ? $minimum : $maximum);
        $period = !empty($job['salaryPeriod']) ? ' / ' . sanitize_text_field((string) $job['salaryPeriod']) : '';

        return $currency . ' ' . $amount . $period;
    }
}
