import 'package:go_router/go_router.dart';

import '../features/home/home_screen.dart';
import '../features/camera/camera_screen.dart';
import '../features/stitching/stitching_screen.dart';
import '../features/viewer/viewer_screen.dart';
import '../features/editor/editor_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      name: 'home',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/progetto/:id/camera',
      name: 'camera',
      builder: (context, state) {
        final progettoId = int.parse(state.pathParameters['id']!);
        return CameraScreen(progettoId: progettoId);
      },
    ),
    GoRoute(
      path: '/progetto/:id/stitching',
      name: 'stitching',
      builder: (context, state) {
        final progettoId = int.parse(state.pathParameters['id']!);
        final fotoPaths = state.extra as List<String>;
        return StitchingScreen(progettoId: progettoId, fotoPaths: fotoPaths);
      },
    ),
    GoRoute(
      path: '/progetto/:id/viewer',
      name: 'viewer',
      builder: (context, state) {
        final progettoId = int.parse(state.pathParameters['id']!);
        final panoramaPath = state.extra as String;
        return ViewerScreen(progettoId: progettoId, panoramaPath: panoramaPath);
      },
    ),
    GoRoute(
      path: '/progetto/:id/editor',
      name: 'editor',
      builder: (context, state) {
        final progettoId = int.parse(state.pathParameters['id']!);
        final panoramaPath = state.extra as String;
        return EditorScreen(progettoId: progettoId, panoramaPath: panoramaPath);
      },
    ),
  ],
);
