# WordPress Plugin Development Instructions for Spaceman Integration

Your agent needs to build a WordPress plugin that provides custom REST API endpoints for the Spaceman CRM integration. These endpoints will enable bi-directional sync of locations and units data.

## Plugin Requirements

### 1. Plugin Structure

Create a plugin with the following structure:

```
spaceman-integration/
├── spaceman-integration.php
├── includes/
│   ├── class-rest-api.php
│   ├── class-location-post-type.php
│   └── class-unit-post-type.php
└── readme.txt
```

### 2. Main Plugin File: `spaceman-integration.php`

```php
<?php
/**
 * Plugin Name: Spaceman Integration
 * Description: REST API endpoints for Spaceman CRM integration
 * Version: 1.0.0
 * Author: Your Name
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

define('SPACEMAN_VERSION', '1.0.0');
define('SPACEMAN_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SPACEMAN_PLUGIN_URL', plugin_dir_url(__FILE__));

// Include required files
require_once SPACEMAN_PLUGIN_DIR . 'includes/class-location-post-type.php';
require_once SPACEMAN_PLUGIN_DIR . 'includes/class-unit-post-type.php';
require_once SPACEMAN_PLUGIN_DIR . 'includes/class-rest-api.php';

// Initialize the plugin
function spaceman_init() {
    // Register custom post types
    Spaceman_Location_Post_Type::register();
    Spaceman_Unit_Post_Type::register();

    // Register REST API routes
    Spaceman_REST_API::register();
}
add_action('plugins_loaded', 'spaceman_init');

// Activation hook
register_activation_hook(__FILE__, function() {
    Spaceman_Location_Post_Type::register();
    Spaceman_Unit_Post_Type::register();
    flush_rewrite_rules();
});

// Deactivation hook
register_deactivation_hook(__FILE__, function() {
    flush_rewrite_rules();
});
```

### 3. Location Post Type: `includes/class-location-post-type.php`

```php
<?php
class Spaceman_Location_Post_Type {

    public static function register() {
        add_action('init', array(__CLASS__, 'register_post_type'));
        add_action('add_meta_boxes', array(__CLASS__, 'add_meta_boxes'));
        add_action('save_post_spaceman_location', array(__CLASS__, 'save_meta_box'));
    }

    public static function register_post_type() {
        $labels = array(
            'name' => 'Locations',
            'singular_name' => 'Location',
            'menu_name' => 'Spaceman Locations',
            'add_new' => 'Add New',
            'add_new_item' => 'Add New Location',
            'edit_item' => 'Edit Location',
            'new_item' => 'New Location',
            'view_item' => 'View Location',
            'search_items' => 'Search Locations',
            'not_found' => 'No locations found',
            'not_found_in_trash' => 'No locations found in trash',
        );

        $args = array(
            'labels' => $labels,
            'public' => true,
            'has_archive' => true,
            'menu_icon' => 'dashicons-building',
            'supports' => array('title', 'editor', 'excerpt'),
            'rewrite' => array('slug' => 'location'),
            'show_in_rest' => true,
        );

        register_post_type('spaceman_location', $args);
    }

    public static function add_meta_boxes() {
        add_meta_box(
            'spaceman_location_details',
            'Location Details',
            array(__CLASS__, 'render_meta_box'),
            'spaceman_location',
            'normal',
            'high'
        );
    }

    public static function render_meta_box($post) {
        wp_nonce_field('spaceman_location_nonce', 'spaceman_location_nonce');

        $address = get_post_meta($post->ID, '_address', true);
        $town_city = get_post_meta($post->ID, '_town_city', true);
        $postcode = get_post_meta($post->ID, '_postcode', true);
        $email = get_post_meta($post->ID, '_email', true);
        $phone = get_post_meta($post->ID, '_phone', true);
        $opening_hours = get_post_meta($post->ID, '_opening_hours', true);
        $latitude = get_post_meta($post->ID, '_latitude', true);
        $longitude = get_post_meta($post->ID, '_longitude', true);

        ?>
        <table class="form-table">
            <tr>
                <th><label for="address">Address Line 1</label></th>
                <td><input type="text" id="address" name="address" value="<?php echo esc_attr($address); ?>" class="regular-text"></td>
            </tr>
            <tr>
                <th><label for="town_city">Town/City</label></th>
                <td><input type="text" id="town_city" name="town_city" value="<?php echo esc_attr($town_city); ?>" class="regular-text"></td>
            </tr>
            <tr>
                <th><label for="postcode">Postcode</label></th>
                <td><input type="text" id="postcode" name="postcode" value="<?php echo esc_attr($postcode); ?>" class="regular-text"></td>
            </tr>
            <tr>
                <th><label for="email">Email</label></th>
                <td><input type="email" id="email" name="email" value="<?php echo esc_attr($email); ?>" class="regular-text"></td>
            </tr>
            <tr>
                <th><label for="phone">Phone</label></th>
                <td><input type="text" id="phone" name="phone" value="<?php echo esc_attr($phone); ?>" class="regular-text"></td>
            </tr>
            <tr>
                <th><label for="opening_hours">Opening Hours</label></th>
                <td><textarea id="opening_hours" name="opening_hours" rows="3" class="large-text"><?php echo esc_textarea($opening_hours); ?></textarea></td>
            </tr>
            <tr>
                <th><label for="latitude">Latitude</label></th>
                <td><input type="text" id="latitude" name="latitude" value="<?php echo esc_attr($latitude); ?>" class="regular-text"></td>
            </tr>
            <tr>
                <th><label for="longitude">Longitude</label></th>
                <td><input type="text" id="longitude" name="longitude" value="<?php echo esc_attr($longitude); ?>" class="regular-text"></td>
            </tr>
        </table>
        <?php
    }

    public static function save_meta_box($post_id) {
        if (!isset($_POST['spaceman_location_nonce']) || !wp_verify_nonce($_POST['spaceman_location_nonce'], 'spaceman_location_nonce')) {
            return;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        $fields = array('address', 'town_city', 'postcode', 'email', 'phone', 'opening_hours', 'latitude', 'longitude');

        foreach ($fields as $field) {
            if (isset($_POST[$field])) {
                update_post_meta($post_id, '_' . $field, sanitize_text_field($_POST[$field]));
            }
        }
    }
}
```

### 4. Unit Post Type: `includes/class-unit-post-type.php`

```php
<?php
class Spaceman_Unit_Post_Type {

    public static function register() {
        add_action('init', array(__CLASS__, 'register_post_type'));
        add_action('add_meta_boxes', array(__CLASS__, 'add_meta_boxes'));
        add_action('save_post_spaceman_unit', array(__CLASS__, 'save_meta_box'));
    }

    public static function register_post_type() {
        $labels = array(
            'name' => 'Units',
            'singular_name' => 'Unit',
            'menu_name' => 'Spaceman Units',
            'add_new' => 'Add New',
            'add_new_item' => 'Add New Unit',
            'edit_item' => 'Edit Unit',
            'new_item' => 'New Unit',
            'view_item' => 'View Unit',
            'search_items' => 'Search Units',
            'not_found' => 'No units found',
            'not_found_in_trash' => 'No units found in trash',
        );

        $args = array(
            'labels' => $labels,
            'public' => true,
            'has_archive' => true,
            'menu_icon' => 'dashicons-archive',
            'supports' => array('title', 'editor', 'excerpt'),
            'rewrite' => array('slug' => 'unit'),
            'show_in_rest' => true,
        );

        register_post_type('spaceman_unit', $args);
    }

    public static function add_meta_boxes() {
        add_meta_box(
            'spaceman_unit_details',
            'Unit Details',
            array(__CLASS__, 'render_meta_box'),
            'spaceman_unit',
            'normal',
            'high'
        );

        add_meta_box(
            'spaceman_unit_location',
            'Location',
            array(__CLASS__, 'render_location_meta_box'),
            'spaceman_unit',
            'side',
            'default'
        );
    }

    public static function render_meta_box($post) {
        wp_nonce_field('spaceman_unit_nonce', 'spaceman_unit_nonce');

        $code = get_post_meta($post->ID, '_code', true);
        $size_sqft = get_post_meta($post->ID, '_size_sqft', true);
        $dimensions = get_post_meta($post->ID, '_dimensions', true);
        $weekly_rate = get_post_meta($post->ID, '_weekly_rate', true);
        $monthly_rate = get_post_meta($post->ID, '_monthly_rate', true);
        $offer = get_post_meta($post->ID, '_offer', true);
        $status = get_post_meta($post->ID, '_status', true);
        $unit_type = get_post_meta($post->ID, '_unit_type', true);

        ?>
        <table class="form-table">
            <tr>
                <th><label for="code">Unit Code</label></th>
                <td><input type="text" id="code" name="code" value="<?php echo esc_attr($code); ?>" class="regular-text" required></td>
            </tr>
            <tr>
                <th><label for="unit_type">Unit Type</label></th>
                <td><input type="text" id="unit_type" name="unit_type" value="<?php echo esc_attr($unit_type); ?>" class="regular-text"></td>
            </tr>
            <tr>
                <th><label for="size_sqft">Size (sq ft)</label></th>
                <td><input type="number" id="size_sqft" name="size_sqft" value="<?php echo esc_attr($size_sqft); ?>" class="regular-text"></td>
            </tr>
            <tr>
                <th><label for="dimensions">Dimensions</label></th>
                <td><input type="text" id="dimensions" name="dimensions" value="<?php echo esc_attr($dimensions); ?>" class="regular-text" placeholder="e.g., 10×10"></td>
            </tr>
            <tr>
                <th><label for="weekly_rate">Weekly Rate</label></th>
                <td><input type="number" id="weekly_rate" name="weekly_rate" value="<?php echo esc_attr($weekly_rate); ?>" class="regular-text" step="0.01"></td>
            </tr>
            <tr>
                <th><label for="monthly_rate">Monthly Rate</label></th>
                <td><input type="number" id="monthly_rate" name="monthly_rate" value="<?php echo esc_attr($monthly_rate); ?>" class="regular-text" step="0.01"></td>
            </tr>
            <tr>
                <th><label for="offer">Special Offer</label></th>
                <td><textarea id="offer" name="offer" rows="2" class="large-text"><?php echo esc_textarea($offer); ?></textarea></td>
            </tr>
            <tr>
                <th><label for="status">Status</label></th>
                <td>
                    <select id="status" name="status" class="regular-text">
                        <option value="available" <?php selected($status, 'available'); ?>>Available</option>
                        <option value="reserved" <?php selected($status, 'reserved'); ?>>Reserved</option>
                        <option value="occupied" <?php selected($status, 'occupied'); ?>>Occupied</option>
                        <option value="maintenance" <?php selected($status, 'maintenance'); ?>>Maintenance</option>
                    </select>
                </td>
            </tr>
        </table>
        <?php
    }

    public static function render_location_meta_box($post) {
        $location_id = get_post_meta($post->ID, '_location_id', true);

        $locations = get_posts(array(
            'post_type' => 'spaceman_location',
            'posts_per_page' => -1,
            'orderby' => 'title',
            'order' => 'ASC',
        ));

        ?>
        <select id="location_id" name="location_id" class="regular-text" style="width: 100%;">
            <option value="">Select Location</option>
            <?php foreach ($locations as $location): ?>
                <option value="<?php echo esc_attr($location->ID); ?>" <?php selected($location_id, $location->ID); ?>>
                    <?php echo esc_html($location->post_title); ?>
                </option>
            <?php endforeach; ?>
        </select>
        <?php
    }

    public static function save_meta_box($post_id) {
        if (!isset($_POST['spaceman_unit_nonce']) || !wp_verify_nonce($_POST['spaceman_unit_nonce'], 'spaceman_unit_nonce')) {
            return;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        $fields = array('code', 'unit_type', 'size_sqft', 'dimensions', 'weekly_rate', 'monthly_rate', 'offer', 'status', 'location_id');

        foreach ($fields as $field) {
            if (isset($_POST[$field])) {
                update_post_meta($post_id, '_' . $field, sanitize_text_field($_POST[$field]));
            }
        }
    }
}
```

### 5. REST API: `includes/class-rest-api.php`

```php
<?php
class Spaceman_REST_API {

    public static function register() {
        add_action('rest_api_init', array(__CLASS__, 'register_routes'));
    }

    public static function register_routes() {
        $namespace = 'spaceman/v1';

        // Locations endpoints
        register_rest_route($namespace, '/locations', array(
            array(
                'methods' => 'GET',
                'callback' => array(__CLASS__, 'get_locations'),
                'permission_callback' => array(__CLASS__, 'check_permission'),
            ),
            array(
                'methods' => 'POST',
                'callback' => array(__CLASS__, 'create_location'),
                'permission_callback' => array(__CLASS__, 'check_permission'),
            ),
        ));

        register_rest_route($namespace, '/locations/(?P<id>\d+)', array(
            array(
                'methods' => 'GET',
                'callback' => array(__CLASS__, 'get_location'),
                'permission_callback' => array(__CLASS__, 'check_permission'),
            ),
            array(
                'methods' => 'PUT',
                'callback' => array(__CLASS__, 'update_location'),
                'permission_callback' => array(__CLASS__, 'check_permission'),
            ),
        ));

        // Units endpoints
        register_rest_route($namespace, '/units', array(
            array(
                'methods' => 'GET',
                'callback' => array(__CLASS__, 'get_units'),
                'permission_callback' => array(__CLASS__, 'check_permission'),
            ),
            array(
                'methods' => 'POST',
                'callback' => array(__CLASS__, 'create_unit'),
                'permission_callback' => array(__CLASS__, 'check_permission'),
            ),
        ));

        register_rest_route($namespace, '/units/(?P<id>\d+)', array(
            array(
                'methods' => 'GET',
                'callback' => array(__CLASS__, 'get_unit'),
                'permission_callback' => array(__CLASS__, 'check_permission'),
            ),
            array(
                'methods' => 'PUT',
                'callback' => array(__CLASS__, 'update_unit'),
                'permission_callback' => array(__CLASS__, 'check_permission'),
            ),
        ));
    }

    public static function check_permission() {
        // Check for Basic Auth
        if (isset($_SERVER['PHP_AUTH_USER']) && isset($_SERVER['PHP_AUTH_PW'])) {
            $user = wp_authenticate($_SERVER['PHP_AUTH_USER'], $_SERVER['PHP_AUTH_PW']);
            if (!is_wp_error($user)) {
                wp_set_current_user($user->ID);
                return current_user_can('edit_posts');
            }
        }
        return false;
    }

    // LOCATIONS METHODS

    public static function get_locations($request) {
        $args = array(
            'post_type' => 'spaceman_location',
            'posts_per_page' => -1,
            'orderby' => 'title',
            'order' => 'ASC',
        );

        $posts = get_posts($args);
        $locations = array();

        foreach ($posts as $post) {
            $locations[] = self::format_location($post);
        }

        return rest_ensure_response($locations);
    }

    public static function get_location($request) {
        $id = $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== 'spaceman_location') {
            return new WP_Error('not_found', 'Location not found', array('status' => 404));
        }

        $location = self::format_location($post);

        // Get units for this location
        $units = get_posts(array(
            'post_type' => 'spaceman_unit',
            'posts_per_page' => -1,
            'meta_key' => '_location_id',
            'meta_value' => $id,
        ));

        $location['units'] = array();
        foreach ($units as $unit) {
            $location['units'][] = self::format_unit($unit);
        }

        return rest_ensure_response($location);
    }

    public static function create_location($request) {
        $params = $request->get_json_params();

        $post_data = array(
            'post_type' => 'spaceman_location',
            'post_title' => sanitize_text_field($params['title']),
            'post_content' => sanitize_textarea_field($params['content'] ?? ''),
            'post_name' => sanitize_title($params['slug'] ?? $params['title']),
            'post_status' => 'publish',
        );

        $post_id = wp_insert_post($post_data);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        // Save meta fields
        if (isset($params['meta'])) {
            self::save_location_meta($post_id, $params['meta']);
        }

        $post = get_post($post_id);
        return rest_ensure_response(self::format_location($post));
    }

    public static function update_location($request) {
        $id = $request->get_param('id');
        $params = $request->get_json_params();

        $post_data = array(
            'ID' => $id,
            'post_title' => sanitize_text_field($params['title']),
            'post_content' => sanitize_textarea_field($params['content'] ?? ''),
        );

        if (isset($params['slug'])) {
            $post_data['post_name'] = sanitize_title($params['slug']);
        }

        $post_id = wp_update_post($post_data);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        // Update meta fields
        if (isset($params['meta'])) {
            self::save_location_meta($id, $params['meta']);
        }

        $post = get_post($id);
        return rest_ensure_response(self::format_location($post));
    }

    private static function format_location($post) {
        return array(
            'id' => $post->ID,
            'title' => $post->post_title,
            'slug' => $post->post_name,
            'content' => $post->post_content,
            'meta' => array(
                'address' => get_post_meta($post->ID, '_address', true),
                'town_city' => get_post_meta($post->ID, '_town_city', true),
                'postcode' => get_post_meta($post->ID, '_postcode', true),
                'email' => get_post_meta($post->ID, '_email', true),
                'phone' => get_post_meta($post->ID, '_phone', true),
                'opening_hours' => get_post_meta($post->ID, '_opening_hours', true),
                'latitude' => get_post_meta($post->ID, '_latitude', true),
                'longitude' => get_post_meta($post->ID, '_longitude', true),
            ),
        );
    }

    private static function save_location_meta($post_id, $meta) {
        $fields = array('address', 'town_city', 'postcode', 'email', 'phone', 'opening_hours', 'latitude', 'longitude');

        foreach ($fields as $field) {
            if (isset($meta[$field])) {
                update_post_meta($post_id, '_' . $field, sanitize_text_field($meta[$field]));
            }
        }
    }

    // UNITS METHODS

    public static function get_units($request) {
        $location_id = $request->get_param('location_id');

        $args = array(
            'post_type' => 'spaceman_unit',
            'posts_per_page' => -1,
            'orderby' => 'title',
            'order' => 'ASC',
        );

        if ($location_id) {
            $args['meta_key'] = '_location_id';
            $args['meta_value'] = $location_id;
        }

        $posts = get_posts($args);
        $units = array();

        foreach ($posts as $post) {
            $units[] = self::format_unit($post);
        }

        return rest_ensure_response($units);
    }

    public static function get_unit($request) {
        $id = $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== 'spaceman_unit') {
            return new WP_Error('not_found', 'Unit not found', array('status' => 404));
        }

        return rest_ensure_response(self::format_unit($post));
    }

    public static function create_unit($request) {
        $params = $request->get_json_params();

        $post_data = array(
            'post_type' => 'spaceman_unit',
            'post_title' => sanitize_text_field($params['title']),
            'post_name' => sanitize_title($params['slug'] ?? $params['title']),
            'post_status' => 'publish',
        );

        $post_id = wp_insert_post($post_data);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        // Save meta fields
        if (isset($params['meta'])) {
            self::save_unit_meta($post_id, $params['meta']);
        }

        $post = get_post($post_id);
        return rest_ensure_response(self::format_unit($post));
    }

    public static function update_unit($request) {
        $id = $request->get_param('id');
        $params = $request->get_json_params();

        $post_data = array(
            'ID' => $id,
            'post_title' => sanitize_text_field($params['title']),
        );

        if (isset($params['slug'])) {
            $post_data['post_name'] = sanitize_title($params['slug']);
        }

        $post_id = wp_update_post($post_data);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        // Update meta fields
        if (isset($params['meta'])) {
            self::save_unit_meta($id, $params['meta']);
        }

        $post = get_post($id);
        return rest_ensure_response(self::format_unit($post));
    }

    private static function format_unit($post) {
        return array(
            'id' => $post->ID,
            'title' => $post->post_title,
            'slug' => $post->post_name,
            'meta' => array(
                'code' => get_post_meta($post->ID, '_code', true),
                'unit_type' => get_post_meta($post->ID, '_unit_type', true),
                'size_sqft' => get_post_meta($post->ID, '_size_sqft', true),
                'dimensions' => get_post_meta($post->ID, '_dimensions', true),
                'weekly_rate' => get_post_meta($post->ID, '_weekly_rate', true),
                'monthly_rate' => get_post_meta($post->ID, '_monthly_rate', true),
                'offer' => get_post_meta($post->ID, '_offer', true),
                'status' => get_post_meta($post->ID, '_status', true),
                'location_id' => get_post_meta($post->ID, '_location_id', true),
            ),
        );
    }

    private static function save_unit_meta($post_id, $meta) {
        $fields = array('code', 'unit_type', 'size_sqft', 'dimensions', 'weekly_rate', 'monthly_rate', 'offer', 'status', 'location_id');

        foreach ($fields as $field) {
            if (isset($meta[$field])) {
                update_post_meta($post_id, '_' . $field, sanitize_text_field($meta[$field]));
            }
        }
    }
}
```

## Installation Instructions

1. Create the plugin directory structure as shown above
2. Place all files in `wp-content/plugins/spaceman-integration/`
3. Activate the plugin through WordPress admin (`/wp-admin/plugins.php`)
4. Create WordPress user with API credentials (Basic Auth)
5. Configure the integration in Spaceman CRM settings

## Testing the Endpoints

You can test endpoints using curl or Postman:

```bash
# Get all locations
curl -X GET https://your-site.com/wp-json/spaceman/v1/locations \
  -u username:password

# Create a location
curl -X POST https://your-site.com/wp-json/spaceman/v1/locations \
  -H "Content-Type: application/json" \
  -u username:password \
  -d '{
    "title": "My Storage Location",
    "slug": "my-storage-location",
    "content": "Description here",
    "meta": {
      "address": "123 Main St",
      "town_city": "London",
      "postcode": "SW1A 1AA",
      "email": "info@example.com",
      "phone": "+44 20 7123 4567"
    }
  }'

# Get units for a location
curl -X GET "https://your-site.com/wp-json/spaceman/v1/units?location_id=123" \
  -u username:password
```

## Security Notes

1. Use HTTPS for all API communications
2. Create dedicated WordPress user with limited permissions (Editor role)
3. Consider using application passwords instead of regular passwords
4. Implement rate limiting if needed
5. Validate all input data as shown in the code

## Response Format Examples

### Location Response
```json
{
  "id": 123,
  "title": "London Storage",
  "slug": "london-storage",
  "content": "Premium storage facility in central London",
  "meta": {
    "address": "123 Main St",
    "town_city": "London",
    "postcode": "SW1A 1AA",
    "email": "london@example.com",
    "phone": "+44 20 7123 4567",
    "opening_hours": "Mon-Fri: 8am-8pm, Sat: 9am-5pm",
    "latitude": "51.5074",
    "longitude": "-0.1278"
  }
}
```

### Unit Response
```json
{
  "id": 456,
  "title": "Unit A101",
  "slug": "unit-a101",
  "meta": {
    "code": "A101",
    "unit_type": "Standard",
    "size_sqft": "100",
    "dimensions": "10×10",
    "weekly_rate": "25.00",
    "monthly_rate": "100.00",
    "offer": "First month half price",
    "status": "available",
    "location_id": "123"
  }
}
```
