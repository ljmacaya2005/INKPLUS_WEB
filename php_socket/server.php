<?php
// Simple Native PHP WebSocket Server
// No external dependencies required (No Ratchet, No Composer)

$host = '127.0.0.1';
$port = 8080;

$server = stream_socket_server("tcp://$host:$port", $errno, $errstr);
if (!$server) {
    die("Error starting server: $errstr ($errno)\n");
}

echo "WebSocket Server started on ws://$host:$port\n";

$clients = [$server];

while (true) {
    $read = $clients;
    $write = null;
    $except = null;
    
    // Wait for activity on any of the sockets
    stream_select($read, $write, $except, null);
    
    foreach ($read as $socket) {
        if ($socket === $server) {
            // Accept new client connection
            $client = stream_socket_accept($server);
            if ($client) {
                $clients[] = $client;
                // Perform WebSocket Handshake
                $request = fread($client, 5000);
                perform_handshake($request, $client, $host, $port);
                echo "New client connected.\n";
            }
        } else {
            // Read data from an existing client
            $data = fread($socket, 5000);
            if (!$data) {
                // Connection closed
                $index = array_search($socket, $clients);
                unset($clients[$index]);
                fclose($socket);
                echo "Client disconnected.\n";
                continue;
            }
            
            $message = unmask($data);
            if ($message === false || empty($message)) continue;
            
            echo "Received: $message\n";
            
            // Broadcast the message to all OTHER clients (e.g. tracking updates)
            $response = mask($message);
            foreach ($clients as $client_socket) {
                if ($client_socket !== $server && $client_socket !== $socket) {
                    @fwrite($client_socket, $response);
                }
            }
        }
    }
}

// Perform WebSocket Handshake
function perform_handshake($request, $client, $host, $port) {
    if (preg_match("/Sec-WebSocket-Key: (.*)\r\n/", $request, $matches)) {
        $key = trim($matches[1]);
        $acceptKey = base64_encode(pack('H*', sha1($key . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')));
        $upgrade  = "HTTP/1.1 101 Switching Protocols\r\n" .
                    "Upgrade: websocket\r\n" .
                    "Connection: Upgrade\r\n" .
                    "Sec-WebSocket-Accept: $acceptKey\r\n\r\n";
        fwrite($client, $upgrade);
    }
}

// Unmask incoming WebSocket frames
function unmask($text) {
    $length = ord($text[1]) & 127;
    if ($length == 126) {
        $masks = substr($text, 4, 4);
        $data = substr($text, 8);
    } elseif ($length == 127) {
        $masks = substr($text, 10, 4);
        $data = substr($text, 14);
    } else {
        $masks = substr($text, 2, 4);
        $data = substr($text, 6);
    }
    
    $text = "";
    for ($i = 0; $i < strlen($data); ++$i) {
        $text .= $data[$i] ^ $masks[$i % 4];
    }
    return $text;
}

// Mask outgoing WebSocket frames
function mask($text) {
    $b1 = 0x80 | (0x1 & 0x0f);
    $length = strlen($text);
    
    if ($length <= 125)
        $header = pack('CC', $b1, $length);
    elseif ($length > 125 && $length < 65536)
        $header = pack('CCn', $b1, 126, $length);
    else
        $header = pack('CCNN', $b1, 127, $length);
        
    return $header . $text;
}
?>
