import 'package:flutter/material.dart';

import 'router.dart';
import 'theme.dart';

class Cucina360App extends StatelessWidget {
  const Cucina360App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Cucina 360°',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      routerConfig: appRouter,
    );
  }
}
