<?php
 if (isset($_SERVER['QUERY_STRING'])) {
  $q = $_SERVER['QUERY_STRING'];
  //$str = str_replace(' ','%20',$q) ;
  //echo $str . "\n" ;
  $request = curl_init($q);
  //curl_setopt($request, CURLOPT_PROXY, 'proxy.fr.nds.com');
  //curl_setopt($request, CURLOPT_PROXYPORT, 8080);
  //curl_setopt($request, CURLOPT_FOLLOWLOCATION, true);
  curl_setopt($request, CURLOPT_RETURNTRANSFER, true);
  $output = curl_exec($request);       
  $code = curl_getinfo($request, CURLINFO_HTTP_CODE);
  $type = curl_getinfo($request, CURLINFO_CONTENT_TYPE);
  curl_close($request);
  if($output) {
   header('HTTP', true, $code);
   header('Content-Type: '.$type.';charset=utf-8');
   //echo base64_encode($output);
   echo $output;
  } else {
   header('HTTP', true, 404);
  }
 }
?>