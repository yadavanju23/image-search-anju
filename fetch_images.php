<?php
header('Content-Type: application/json');

$dir = __DIR__ . '/images';
$base = 'images/';

$data = [];

if (is_dir($dir)) {
    $files = scandir($dir);

    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;

        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));

        if (in_array($ext, ['jpg','jpeg','png','webp'])) {
            $data[] = [
                "image" => $base . $file,
                "name" => pathinfo($file, PATHINFO_FILENAME)
            ];
        }
    }
}

echo json_encode($data);