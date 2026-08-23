<?php
$jobicy_remote_jobs_widget_manifest = <<<'JOBICY_REMOTE_JOBS_WIDGET_MANIFEST'
Plugin Name: Jobicy Remote Jobs Widget
Description: Display cached remote jobs from the public Jobicy API with the [jobicy_jobs] shortcode.
Version: 1.0.0
Requires at least: 6.0
Requires PHP: 7.4
Author: Jobicy
License: MIT
Text Domain: jobicy-remote-jobs-widget
JOBICY_REMOTE_JOBS_WIDGET_MANIFEST;
unset($jobicy_remote_jobs_widget_manifest);

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/includes/class-jobicy-api-client.php';
require_once __DIR__ . '/includes/class-jobicy-jobs-shortcode.php';

add_action('init', static function (): void {
    $client = new Jobicy_Remote_Jobs_Api_Client();
    $shortcode = new Jobicy_Remote_Jobs_Shortcode($client, plugin_dir_url(__FILE__) . 'assets/style.css');
    $shortcode->register();
});
