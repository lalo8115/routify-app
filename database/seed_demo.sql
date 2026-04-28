-- =====================================================
-- TrapoApp - Seed demo para presentaciones
-- =====================================================

INSERT INTO negocios (id, nombre, activo)
VALUES ('11111111-1111-1111-1111-111111111111', 'Trapo Demo', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO usuarios_negocio (id, user_id, negocio_id, nombre, email, rol, activo)
VALUES
  ('22222222-2222-2222-2222-222222222221', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Admin Demo', 'admin@demo.local', 'admin', true),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Vendedor Demo', 'vendedor@demo.local', 'vendedor', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO categorias_cliente (id, negocio_id, nombre, descripcion, activo)
VALUES
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Mecánico', 'Talleres y mecánicas', true),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Torno', 'Talleres de torno', true),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Rectificadora', 'Rectificadoras', true),
  ('33333333-3333-3333-3333-333333333334', '11111111-1111-1111-1111-111111111111', 'Hojalatería', 'Hojalaterías y carrocerías', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO productos (id, negocio_id, nombre, descripcion, unidad_medida, precio_base, activo)
VALUES
  ('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'Trapo Blanco 1a', 'Presentación premium', 'kg', 45.00, true),
  ('44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', 'Trapo Color', 'Mixto por color', 'kg', 32.00, true),
  ('44444444-4444-4444-4444-444444444443', '11111111-1111-1111-1111-111111111111', 'Estopa Industrial', 'Uso industrial', 'kg', 24.00, true),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Trapo Industrial', 'Uso general', 'kg', 28.00, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO clientes (id, negocio_id, user_id, categoria_id, nombre, tipo_negocio, celular, precio_sugerido, latitud, longitud, activo)
VALUES
  ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333331', 'Taller Los Pinos', 'Mecánico', '+525512345678', 45.00, 25.74600000, -100.28010000, true),
  ('55555555-5555-5555-5555-555555555552', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333332', 'Torno González', 'Torno', '+525587654321', 32.00, 25.74800000, -100.28500000, true),
  ('55555555-5555-5555-5555-555555555553', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'Rectificadora del Norte', 'Rectificadora', '+525555555555', 28.00, 25.75000000, -100.29000000, true),
  ('55555555-5555-5555-5555-555555555554', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333334', 'Hojalatería Express', 'Hojalatería', '+525544444444', 24.00, 25.74200000, -100.27500000, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO visitas (id, negocio_id, user_id, cliente_id, producto_id, resultado, tipo_trapo, precio_kilo_aplicado, kilos_vendidos, precio_unitario, cantidad, monto_total, monto_pagado, fecha)
VALUES
  ('66666666-6666-6666-6666-666666666661', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 'Venta', 'Industrial', 45.00, 10.00, 45.00, 10.00, 450.00, 450.00, now() - interval '2 days'),
  ('66666666-6666-6666-6666-666666666662', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444442', 'Venta', 'Color', 32.00, 8.50, 32.00, 8.50, 272.00, 200.00, now() - interval '5 days'),
  ('66666666-6666-6666-6666-666666666663', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555553', '44444444-4444-4444-4444-444444444443', 'Abono', 'N/A', 28.00, 0.00, 28.00, 0.00, 180.00, 80.00, now() - interval '9 days'),
  ('66666666-6666-6666-6666-666666666664', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555554', '44444444-4444-4444-4444-444444444444', 'No_Venta', 'N/A', 24.00, 0.00, 24.00, 0.00, 0.00, 0.00, now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;