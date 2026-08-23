<?php
if (!defined('ABSPATH')) {
    exit;
}

final class Jobicy_Remote_Jobs_Api_Client
{
    private const API_URL = 'https://jobicy.com/api/v2/remote-jobs';
    private const CACHE_TTL = HOUR_IN_SECONDS;
    private const STALE_TTL = DAY_IN_SECONDS;

    public function get_jobs(array $filters): array
    {
        $count = min(100, max(1, absint($filters['count'] ?? 10)));
        $query = ['count' => $count];

        foreach (['geo', 'industry', 'tag'] as $key) {
            $value = sanitize_text_field((string) ($filters[$key] ?? ''));

            if ($value !== '') {
                $query[$key] = $value;
            }
        }

        $hash = md5(wp_json_encode($query));
        $cache_key = 'jobicy_jobs_' . $hash;
        $stale_key = 'jobicy_stale_' . $hash;
        $cached = get_transient($cache_key);

        if (is_array($cached)) {
            return ['jobs' => $cached, 'stale' => false, 'error' => ''];
        }

        if (get_transient($cache_key . '_limited')) {
            return $this->fallback($stale_key, 'Jobicy is temporarily rate limiting requests.');
        }

        $response = wp_safe_remote_get(add_query_arg($query, self::API_URL), [
            'timeout' => 12,
            'redirection' => 2,
            'headers' => [
                'Accept' => 'application/json',
                'User-Agent' => 'Jobicy-Integration-Example/wordpress-widget',
            ],
        ]);

        if (is_wp_error($response)) {
            return $this->fallback($stale_key, $response->get_error_message());
        }

        $status = (int) wp_remote_retrieve_response_code($response);

        if ($status < 200 || $status >= 300) {
            if ($status === 429) {
                $retry_after = wp_remote_retrieve_header($response, 'retry-after');
                $delay = is_numeric($retry_after) ? max(60, min(DAY_IN_SECONDS, (int) $retry_after)) : HOUR_IN_SECONDS;
                set_transient($cache_key . '_limited', 1, $delay);
            }

            return $this->fallback($stale_key, sprintf('Jobicy returned HTTP %d.', $status));
        }

        $decoded = json_decode(wp_remote_retrieve_body($response), true);

        if (!is_array($decoded) || !isset($decoded['jobs']) || !is_array($decoded['jobs'])) {
            return $this->fallback($stale_key, 'Jobicy returned an invalid jobs response.');
        }

        $unique = [];

        foreach ($decoded['jobs'] as $job) {
            if (!is_array($job) || !isset($job['id'], $job['url']) || !is_string($job['url'])) {
                continue;
            }

            $url = wp_parse_url($job['url']);

            if (!is_array($url) || ($url['scheme'] ?? '') !== 'https' || ($url['host'] ?? '') !== 'jobicy.com') {
                continue;
            }

            $unique[(string) $job['id']] = $job;
        }

        $jobs = array_values($unique);
        set_transient($cache_key, $jobs, self::CACHE_TTL);
        set_transient($stale_key, $jobs, self::STALE_TTL);

        return ['jobs' => $jobs, 'stale' => false, 'error' => ''];
    }

    private function fallback(string $cache_key, string $message): array
    {
        $stale = get_transient($cache_key);

        if (is_array($stale)) {
            return ['jobs' => $stale, 'stale' => true, 'error' => $message];
        }

        return ['jobs' => [], 'stale' => false, 'error' => $message];
    }
}
