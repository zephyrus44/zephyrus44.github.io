import { useState, useEffect, useMemo, useRef, useCallback } from "react";

/* Temple War · Z3 — v5
   Full map from Steven's CAD-traced SVG: 46 closed territories
   (43 bases · 2 sanctuaries · temple) + 12 gate markers on the ring.
   Rulers show approximate game coordinates (anchor: temple = 500,500,
   2.554 px/unit; X increases left, Y increases up).                   */

const PTS = { base: 300, gate: 1500, sanct: 1500, temple: 10000 };
const CAP = 10000; // max territory rewards per alliance
const COLORS = ["#F4BF41", "#F08C33", "#BB7128", "#784633", "#EC4441", "#7B2E40", "#D7538F", "#8647BA", "#621D6F", "#272742", "#3950CF", "#3E8CD7", "#414569", "#627FAB", "#428A92", "#50B080", "#5DA52F", "#40632D"];
const COLOR_NAMES = ["Gold", "Orange", "Bronze", "Brown", "Red", "Maroon", "Pink", "Purple", "Violet", "Midnight", "Blue", "Azure", "Slate", "Steel", "Teal", "Jade", "Green", "Forest"];
const KEY = "arc-z3-templewar-v5";
const PPU = 2.554, AX = 1024, AY = 1024; // px anchor = (500,500)
const FEATS = [{"id":"temple","type":"temple","x":1024.0,"y":1024.0,"gx":500,"gy":500,"d":"M1018.9 1080.3L1018.9 1090.5L1034.2 1090.5L1047.0 1090.5L1047.0 1080.3L1059.8 1080.3L1059.8 1054.7L1072.6 1054.7L1072.6 1016.3L1059.8 1016.3L1059.8 1001.0L1059.8 988.2L1034.2 988.2L1034.2 977.9L1008.6 977.9L1008.6 988.2L983.0 988.2L983.0 998.4L983.0 1016.3L970.2 1016.3L970.2 1036.8L970.2 1049.6L985.6 1049.6L985.6 1062.4L1008.6 1062.4L1008.6 1080.3Z"},{"id":"s0","type":"sanct","x":1034.2,"y":844.8,"gx":496,"gy":570,"d":"M983.0 885.8L1008.6 885.8L1021.4 885.8L1021.4 870.4L1036.8 870.4L1036.8 885.8L1047.0 885.8L1047.0 870.4L1059.8 870.4L1059.8 860.2L1072.6 860.2L1072.6 844.8L1059.8 844.8L1059.8 834.6L1072.6 834.6L1072.6 793.6L1059.8 793.6L1059.8 783.4L1047.0 783.4L1047.0 770.6L1034.2 770.6L1034.2 760.4L1021.4 760.4L1021.4 770.6L1008.6 770.6L1008.6 786.0L1021.4 786.0L1021.4 811.6L983.0 811.6L983.0 837.1L995.9 837.1L995.9 850.0L983.0 850.0L983.0 857.6Z"},{"id":"s1","type":"sanct","x":1034.2,"y":1180.1,"gx":496,"gy":439,"d":"M1034.2 1126.4L1034.2 1118.7L1024.0 1118.7L1024.0 1144.3L1008.6 1144.3L1008.6 1157.1L995.9 1157.1L995.9 1182.7L983.0 1182.7L983.0 1190.4L983.0 1208.3L995.9 1208.3L995.9 1221.1L1047.0 1221.1L1047.0 1231.3L1072.6 1231.3L1072.6 1218.5L1085.4 1218.5L1085.4 1182.7L1072.6 1182.7L1072.6 1169.9L1085.4 1169.9L1085.4 1157.1L1059.8 1157.1L1059.8 1144.3L1072.6 1144.3L1072.6 1126.4Z"},{"id":"b496_530","type":"base","x":1034.2,"y":947.2,"gx":496,"gy":530,"d":"M1059.8 988.2L1059.8 1001.0L1072.6 1001.0L1072.6 985.6L1085.4 985.6L1085.4 977.9L1095.7 977.9L1095.7 947.2L1085.4 947.2L1085.4 947.2L1085.4 937.0L1072.6 937.0L1072.6 924.2L1047.0 924.2L1047.0 913.9L1021.4 913.9L1021.4 901.1L1008.6 901.1L1008.6 885.8L983.0 885.8L983.0 901.1L972.8 901.1L972.8 926.7L983.0 926.7L983.0 952.3L995.9 952.3L995.9 962.6L1008.6 962.6L1008.6 977.9L1034.2 977.9L1034.2 988.2Z"},{"id":"b479_560","type":"base","x":1077.8,"y":870.4,"gx":479,"gy":560,"d":"M1047.0 924.2L1072.6 924.2L1072.6 911.4L1111.0 911.4L1111.0 898.6L1098.2 898.6L1098.2 885.8L1111.0 885.8L1111.0 860.2L1123.8 860.2L1123.8 821.8L1136.6 821.8L1136.6 809.0L1111.0 809.0L1111.0 793.6L1098.2 793.2L1098.2 809.0L1085.4 809.0L1085.4 793.6L1072.6 793.6L1072.6 834.6L1059.8 834.6L1059.8 844.8L1072.6 844.8L1072.6 860.2L1059.8 860.2L1059.8 870.4L1047.0 870.4L1047.0 885.8L1036.8 885.8L1036.8 870.4L1021.4 870.4L1021.4 885.8L1008.6 885.8L1008.6 901.1L1021.4 901.1L1021.4 913.9L1047.0 913.9Z"},{"id":"b470_600","type":"base","x":1100.8,"y":768.0,"gx":470,"gy":600,"d":"M1034.2 760.4L1034.2 770.6L1047.0 770.6L1047.0 783.4L1059.8 783.4L1059.8 793.6L1072.6 793.6L1085.4 793.6L1085.4 809.0L1098.2 809.0L1098.2 793.2L1111.0 793.6L1111.0 783.4L1121.3 783.4L1121.3 747.6L1111.0 747.6L1111.0 734.8L1121.3 734.8L1121.3 719.4L1121.3 709.2L1111.0 709.2L1111.0 722.0L1088.0 722.0L1088.0 734.8L1059.8 734.8L1059.8 750.1L1047.0 750.1L1047.0 760.4Z"},{"id":"b453_596","type":"base","x":1144.3,"y":778.3,"gx":453,"gy":596,"d":"M1111.0 793.6L1111.0 809.0L1136.6 809.0L1136.6 821.8L1149.4 821.8L1149.4 809.0L1162.2 809.0L1162.2 796.2L1175.0 796.2L1175.0 783.4L1187.8 783.4L1187.8 757.8L1187.8 745.0L1175.0 745.0L1175.0 732.2L1149.4 732.2L1149.4 719.4L1121.3 719.4L1121.3 734.8L1111.0 734.8L1111.0 747.6L1121.3 747.6L1121.3 783.4L1111.0 783.4Z"},{"id":"b455_564","type":"base","x":1139.2,"y":860.2,"gx":455,"gy":564,"d":"M1136.6 821.8L1123.8 821.8L1123.8 860.2L1111.0 860.2L1111.0 885.8L1098.2 885.8L1098.2 898.6L1111.0 898.6L1111.0 911.4L1123.8 911.4L1123.8 926.7L1134.1 926.7L1134.1 911.4L1149.4 911.4L1149.4 901.1L1187.8 901.1L1187.8 888.4L1200.6 888.4L1200.6 870.4L1200.6 860.2L1175.0 860.2L1175.0 850.0L1162.2 850.0L1162.2 834.6L1175.0 834.6L1175.0 821.8L1187.8 821.8L1187.8 809.0L1200.6 809.0L1200.6 796.2L1213.4 796.2L1213.4 786.0L1200.6 786.0L1200.6 757.8L1187.8 757.8L1187.8 783.4L1175.0 783.4L1175.0 796.2L1162.2 796.2L1162.2 809.0L1149.4 809.0L1149.4 821.8Z"},{"id":"b430_577","type":"base","x":1203.2,"y":826.9,"gx":430,"gy":577,"d":"M1200.6 757.8L1200.6 786.0L1213.4 786.0L1213.4 796.2L1200.6 796.2L1200.6 809.0L1187.8 809.0L1187.8 821.8L1175.0 821.8L1175.0 834.6L1162.2 834.6L1162.2 850.0L1175.0 850.0L1175.0 860.2L1200.6 860.2L1200.6 870.4L1213.4 870.4L1213.4 860.2L1228.8 860.2L1228.8 844.8L1239.0 844.8L1239.0 819.2L1251.8 819.2L1251.8 798.8L1251.8 783.4L1236.4 783.4L1236.4 770.6L1213.4 770.6L1213.4 757.8Z"},{"id":"b404_573","type":"base","x":1269.7,"y":837.1,"gx":404,"gy":573,"d":"M1200.6 870.4L1200.6 888.4L1213.4 888.4L1213.4 901.1L1239.0 901.1L1239.0 888.4L1274.8 888.4L1274.8 850.0L1290.2 850.0L1290.2 837.1L1300.4 837.1L1300.4 824.4L1290.2 824.4L1290.2 811.6L1277.4 811.6L1277.4 798.8L1251.8 798.8L1251.8 819.2L1239.0 819.2L1239.0 844.8L1228.8 844.8L1228.8 860.2L1213.4 860.2L1213.4 870.4Z"},{"id":"b409_541","type":"base","x":1256.9,"y":919.1,"gx":409,"gy":541,"d":"M1274.8 888.4L1239.0 888.4L1239.0 901.1L1213.4 901.1L1213.4 911.4L1200.6 911.4L1200.6 924.2L1213.4 924.2L1213.4 937.0L1200.6 937.0L1200.6 949.8L1213.4 949.8L1213.4 962.6L1226.2 962.6L1239.0 962.6L1239.0 949.8L1264.6 949.8L1264.6 937.0L1290.2 937.0L1290.2 924.2L1303.0 924.2L1303.0 896.0L1290.2 896.0L1290.2 888.4Z"},{"id":"b388_526","type":"base","x":1310.7,"y":957.5,"gx":388,"gy":526,"d":"M1300.4 985.6L1315.8 985.6L1315.8 972.8L1328.6 972.8L1328.6 962.6L1341.4 962.6L1341.4 949.8L1328.6 949.8L1328.6 924.2L1303.0 924.2L1290.2 924.2L1290.2 937.0L1264.6 937.0L1264.6 949.8L1239.0 949.8L1239.0 962.6L1226.2 962.6L1226.2 975.4L1239.0 975.4L1239.0 985.6L1251.8 985.6L1251.8 1001.0L1277.4 1001.0L1277.4 985.6Z"},{"id":"b448_538","type":"base","x":1157.1,"y":926.7,"gx":448,"gy":538,"d":"M1095.7 947.2L1095.7 977.9L1095.7 988.2L1123.8 988.2L1136.6 988.2L1136.6 975.4L1162.2 975.4L1162.2 947.2L1175.0 947.2L1175.0 937.0L1200.6 937.0L1213.4 937.0L1213.4 924.2L1200.6 924.2L1200.6 911.4L1213.4 911.4L1213.4 901.1L1213.4 888.4L1200.6 888.4L1187.8 888.4L1187.8 901.1L1149.4 901.1L1149.4 911.4L1134.1 911.4L1134.1 926.7L1123.8 926.7L1123.8 911.4L1111.0 911.4L1072.6 911.4L1072.6 924.2L1072.6 937.0L1085.4 937.0L1085.4 947.2Z"},{"id":"b433_511","type":"base","x":1195.5,"y":995.9,"gx":433,"gy":511,"d":"M1300.4 985.6L1277.4 985.6L1277.4 1001.0L1251.8 1001.0L1251.8 985.6L1239.0 985.6L1239.0 975.4L1226.2 975.4L1226.2 962.6L1213.4 962.6L1213.4 949.8L1200.6 949.8L1200.6 937.0L1175.0 937.0L1175.0 947.2L1162.2 947.2L1162.2 975.4L1162.2 988.2L1175.0 988.2L1175.0 1026.6L1187.8 1026.6L1200.6 1026.6L1200.6 1013.8L1226.2 1013.8L1226.2 1026.6L1264.6 1026.6L1264.6 1039.4L1277.4 1039.4L1277.4 1052.2L1290.2 1052.2L1290.2 1039.4L1300.4 1039.4Z"},{"id":"b452_500","type":"base","x":1146.9,"y":1024.0,"gx":452,"gy":500,"d":"M1162.2 975.4L1136.6 975.4L1136.6 988.2L1123.8 988.2L1123.8 1001.0L1111.0 1001.0L1111.0 1013.8L1123.8 1013.8L1123.8 1052.2L1111.0 1052.2L1111.0 1093.1L1098.2 1093.1L1098.2 1103.3L1085.4 1103.3L1085.4 1113.6L1113.6 1113.6L1113.6 1128.9L1123.8 1128.9L1123.8 1113.6L1136.6 1113.6L1136.6 1103.3L1149.4 1103.3L1149.4 1088.0L1162.2 1088.0L1162.2 1065.0L1175.0 1065.0L1175.0 1036.8L1187.8 1036.8L1187.8 1026.6L1175.0 1026.6L1175.0 988.2L1162.2 988.2Z"},{"id":"b476_495","type":"base","x":1085.4,"y":1036.8,"gx":476,"gy":495,"d":"M1047.0 1090.5L1034.2 1090.5L1034.2 1118.7L1034.2 1126.4L1072.6 1126.4L1072.6 1113.6L1085.4 1113.6L1085.4 1103.3L1098.2 1103.3L1098.2 1093.1L1111.0 1093.1L1111.0 1052.2L1123.8 1052.2L1123.8 1013.8L1111.0 1013.8L1111.0 1001.0L1123.8 1001.0L1123.8 988.2L1095.7 988.2L1095.7 977.9L1085.4 977.9L1085.4 985.6L1072.6 985.6L1072.6 1001.0L1059.8 1001.0L1059.8 1016.3L1072.6 1016.3L1072.6 1054.7L1059.8 1054.7L1059.8 1080.3L1047.0 1080.3Z"},{"id":"b440_471","type":"base","x":1177.6,"y":1098.2,"gx":440,"gy":471,"d":"M1175.0 1065.0L1162.2 1065.0L1162.2 1088.0L1149.4 1088.0L1149.4 1103.3L1149.4 1116.1L1162.2 1116.1L1162.2 1128.9L1162.2 1141.7L1175.0 1141.7L1175.0 1131.5L1200.6 1131.5L1200.6 1141.7L1226.2 1141.7L1226.2 1128.9L1239.0 1128.9L1239.0 1116.1L1251.8 1116.1L1251.8 1077.8L1226.2 1077.8L1226.2 1090.5L1213.4 1090.5L1213.4 1077.8L1187.8 1077.8L1187.8 1065.0Z"},{"id":"b417_489","type":"base","x":1236.4,"y":1052.2,"gx":417,"gy":489,"d":"M1277.4 1052.2L1277.4 1039.4L1264.6 1039.4L1264.6 1026.6L1226.2 1026.6L1226.2 1013.8L1200.6 1013.8L1200.6 1026.6L1187.8 1026.6L1187.8 1036.8L1175.0 1036.8L1175.0 1065.0L1187.8 1065.0L1187.8 1077.8L1213.4 1077.8L1213.4 1090.5L1226.2 1090.5L1226.2 1077.8L1251.8 1077.8L1277.4 1077.8Z"},{"id":"b440_448","type":"base","x":1177.6,"y":1157.1,"gx":440,"gy":448,"d":"M1239.0 1128.9L1226.2 1128.9L1226.2 1141.7L1200.6 1141.7L1200.6 1131.5L1175.0 1131.5L1175.0 1141.7L1162.2 1141.7L1162.2 1128.9L1149.4 1128.9L1149.4 1144.3L1136.6 1144.3L1136.6 1180.1L1123.8 1180.1L1123.8 1192.9L1136.6 1192.9L1136.6 1218.5L1149.4 1218.5L1149.4 1231.3L1162.2 1231.3L1162.2 1241.6L1175.0 1241.6L1175.0 1259.5L1187.8 1259.5L1187.8 1233.9L1200.6 1233.9L1200.6 1218.5L1187.8 1218.5L1187.8 1195.5L1200.6 1195.5L1200.6 1167.3L1239.0 1167.3L1239.0 1157.1Z"},{"id":"b415_434","type":"base","x":1241.6,"y":1192.9,"gx":415,"gy":434,"d":"M1277.4 1244.1L1303.0 1244.1L1303.0 1218.5L1290.2 1218.5L1290.2 1192.9L1277.4 1192.9L1277.4 1180.1L1264.6 1180.1L1264.6 1167.3L1251.8 1167.3L1251.8 1157.1L1239.0 1157.1L1239.0 1167.3L1200.6 1167.3L1200.6 1195.5L1187.8 1195.5L1187.8 1218.5L1200.6 1218.5L1213.4 1218.5L1213.4 1208.3L1226.2 1208.3L1226.2 1218.5L1264.6 1218.5L1264.6 1233.9L1277.4 1233.9Z"},{"id":"b425_414","type":"base","x":1216.0,"y":1244.1,"gx":425,"gy":414,"d":"M1277.4 1244.1L1277.4 1233.9L1264.6 1233.9L1264.6 1218.5L1226.2 1218.5L1226.2 1208.3L1213.4 1208.3L1213.4 1218.5L1200.6 1218.5L1200.6 1233.9L1187.8 1233.9L1187.8 1259.5L1200.6 1259.5L1200.6 1285.1L1213.4 1285.1L1213.4 1292.8L1239.0 1292.8L1239.0 1280.0L1251.8 1280.0L1251.8 1267.2L1277.4 1267.2Z"},{"id":"b445_397","type":"base","x":1164.8,"y":1287.6,"gx":445,"gy":397,"d":"M1213.4 1292.8L1213.4 1285.1L1200.6 1285.1L1200.6 1259.5L1187.8 1259.5L1175.0 1259.5L1175.0 1241.6L1162.2 1241.6L1162.2 1231.3L1149.4 1231.3L1149.4 1218.5L1136.6 1218.5L1136.6 1244.1L1136.6 1256.9L1149.4 1256.9L1149.4 1272.3L1136.6 1272.3L1136.6 1297.9L1149.4 1297.9L1149.4 1333.7L1175.0 1333.7L1175.0 1318.3L1200.6 1318.3L1200.6 1308.1L1213.4 1308.1Z"},{"id":"b521_394","type":"base","x":970.2,"y":1295.3,"gx":521,"gy":394,"d":"M983.0 1256.9L970.2 1256.9L957.5 1256.9L957.5 1269.7L931.9 1269.7L931.9 1285.1L921.6 1285.1L921.6 1320.9L921.6 1346.5L934.4 1346.5L934.4 1359.3L944.7 1359.3L944.7 1346.5L957.5 1346.5L957.5 1331.1L970.2 1331.1L970.2 1320.9L983.0 1320.9L983.0 1308.1L995.9 1308.1L995.9 1295.3L1008.6 1295.3L1008.6 1280.0L995.9 1280.0L995.9 1269.7L983.0 1269.7Z"},{"id":"b567_420","type":"base","x":852.5,"y":1228.8,"gx":567,"gy":420,"d":"M857.6 1269.7L857.6 1259.5L880.7 1259.5L880.7 1246.7L893.5 1246.7L893.5 1231.3L906.3 1231.3L906.3 1221.1L893.5 1221.1L893.5 1192.9L880.7 1192.9L880.7 1180.1L855.1 1180.1L842.3 1180.1L842.3 1208.3L829.5 1208.3L829.5 1221.1L803.9 1221.1L803.9 1228.8L803.9 1244.1L832.0 1244.1L832.0 1256.9L844.8 1256.9L844.8 1269.7Z"},{"id":"b587_438","type":"base","x":801.3,"y":1182.7,"gx":587,"gy":438,"d":"M803.9 1228.8L803.9 1221.1L829.5 1221.1L829.5 1208.3L842.3 1208.3L842.3 1180.1L855.1 1180.1L855.1 1164.8L844.8 1164.8L844.8 1152.0L829.5 1152.0L829.5 1141.7L791.1 1141.7L791.1 1152.0L778.3 1152.0L778.3 1167.3L768.0 1167.3L768.0 1190.4L778.3 1190.4L778.3 1228.8Z"},{"id":"b549_400","type":"base","x":898.6,"y":1280.0,"gx":549,"gy":400,"d":"M921.6 1320.9L921.6 1285.1L931.9 1285.1L931.9 1269.7L957.5 1269.7L957.5 1256.9L944.7 1256.9L944.7 1244.1L931.9 1244.1L931.9 1231.3L919.1 1231.3L919.1 1221.1L906.3 1221.1L906.3 1231.3L893.5 1231.3L893.5 1246.7L880.7 1246.7L880.7 1259.5L857.6 1259.5L857.6 1269.7L857.6 1280.0L870.4 1280.0L870.4 1295.3L883.2 1295.3L883.2 1308.1L896.0 1308.1L896.0 1320.9Z"},{"id":"b461_406","type":"base","x":1123.8,"y":1264.6,"gx":461,"gy":406,"d":"M1149.4 1333.7L1149.4 1297.9L1136.6 1297.9L1136.6 1272.3L1149.4 1272.3L1149.4 1256.9L1136.6 1256.9L1136.6 1244.1L1123.8 1244.1L1123.8 1231.3L1098.2 1231.3L1098.2 1272.3L1085.4 1272.3L1085.4 1285.1L1072.6 1285.1L1072.6 1295.3L1059.8 1295.3L1059.8 1308.1L1100.8 1308.1L1100.8 1318.3L1126.4 1318.3L1126.4 1333.7L1136.6 1333.7L1136.6 1343.9L1149.4 1343.9Z"},{"id":"b495_413","type":"base","x":1036.8,"y":1246.7,"gx":495,"gy":413,"d":"M1059.8 1308.1L1059.8 1295.3L1072.6 1295.3L1072.6 1285.1L1085.4 1285.1L1085.4 1272.3L1098.2 1272.3L1098.2 1231.3L1072.6 1231.3L1047.0 1231.3L1047.0 1221.1L995.9 1221.1L995.9 1233.9L983.0 1233.9L983.0 1244.1L970.2 1244.1L970.2 1256.9L983.0 1256.9L983.0 1269.7L995.9 1269.7L995.9 1280.0L1008.6 1280.0L1008.6 1295.3L1036.8 1295.3L1036.8 1308.1L1049.6 1308.1L1049.6 1318.3L1059.8 1318.3Z"},{"id":"b595_518","type":"base","x":780.9,"y":977.9,"gx":595,"gy":518,"d":"M742.5 985.6L768.0 985.6L768.0 998.4L806.4 998.4L806.4 985.6L832.0 985.6L832.0 998.4L857.6 998.4L857.6 972.8L844.8 972.8L844.8 960.0L832.0 960.0L832.0 947.2L793.6 947.2L793.6 934.4L780.9 934.4L755.2 934.4L755.2 960.0L742.5 960.0L742.5 972.8L729.7 972.8L729.7 985.6Z"},{"id":"b556_552","type":"base","x":880.7,"y":890.9,"gx":556,"gy":552,"d":"M883.2 921.6L883.2 934.4L908.8 934.4L908.8 896.0L921.6 896.0L921.6 883.2L934.4 883.2L934.4 870.4L947.2 870.4L947.2 857.6L921.6 857.6L921.6 832.0L896.0 832.0L896.0 844.8L844.8 844.8L819.2 844.8L819.2 857.6L806.4 857.6L806.4 870.4L832.0 870.4L832.0 883.2L844.8 883.2L844.8 908.8L857.6 908.8L857.6 921.6Z"},{"id":"b583_582","type":"base","x":811.6,"y":814.1,"gx":583,"gy":582,"d":"M819.2 844.8L844.8 844.8L844.8 832.0L857.6 832.0L857.6 819.2L844.8 819.2L844.8 793.6L832.0 793.6L832.0 780.9L819.2 780.9L793.6 780.9L793.6 793.6L780.9 793.6L780.9 806.4L768.0 806.4L768.0 819.2L755.2 819.2L755.2 832.0L768.0 832.0L768.0 844.8L780.9 844.8L780.9 857.6L793.6 857.6L793.6 870.4L806.4 870.4L806.4 857.6L819.2 857.6Z"},{"id":"b521_527","type":"base","x":970.2,"y":954.9,"gx":521,"gy":527,"d":"M1008.6 988.2L1008.6 977.9L1008.6 962.6L995.9 962.6L995.9 952.3L983.0 952.3L983.0 926.7L972.8 926.7L972.8 901.1L983.0 901.1L983.0 885.8L983.0 857.6L972.8 857.6L972.8 870.4L947.2 870.4L934.4 870.4L934.4 883.2L921.6 883.2L921.6 896.0L908.8 896.0L908.8 934.4L908.8 947.2L934.4 947.2L934.4 960.0L947.2 960.0L947.2 972.8L960.0 972.8L960.0 985.6L972.8 985.6L972.8 998.4L983.0 998.4L983.0 988.2Z"},{"id":"b562_591","type":"base","x":865.3,"y":791.1,"gx":562,"gy":591,"d":"M896.0 832.0L921.6 832.0L921.6 819.2L908.8 819.2L908.8 793.6L896.0 793.6L896.0 780.9L883.2 780.9L883.2 768.0L870.4 768.0L870.4 755.2L844.8 755.2L832.0 755.2L832.0 768.0L819.2 768.0L819.2 780.9L832.0 780.9L832.0 793.6L844.8 793.6L844.8 819.2L857.6 819.2L857.6 832.0L844.8 832.0L844.8 844.8L896.0 844.8Z"},{"id":"b539_608","type":"base","x":924.2,"y":747.6,"gx":539,"gy":608,"d":"M883.2 729.6L883.2 742.5L908.8 742.5L908.8 768.0L934.4 768.0L934.4 793.6L960.0 793.6L972.8 793.6L972.8 755.2L960.0 755.2L960.0 716.9L934.4 716.9L934.4 691.3L908.8 691.3L908.8 704.1L896.0 704.1L896.0 716.9L883.2 716.9Z"},{"id":"b525_577","type":"base","x":960.0,"y":826.9,"gx":525,"gy":577,"d":"M983.0 857.6L983.0 850.0L995.9 850.0L995.9 837.1L983.0 837.1L983.0 811.6L983.0 806.4L960.0 806.4L960.0 793.6L934.4 793.6L934.4 768.0L908.8 768.0L908.8 742.5L883.2 742.5L883.2 729.6L870.4 729.6L870.4 742.5L844.8 742.5L844.8 755.2L870.4 755.2L870.4 768.0L883.2 768.0L883.2 780.9L896.0 780.9L896.0 793.6L908.8 793.6L908.8 819.2L921.6 819.2L921.6 832.0L921.6 857.6L947.2 857.6L947.2 870.4L972.8 870.4L972.8 857.6Z"},{"id":"b578_540","type":"base","x":824.4,"y":921.6,"gx":578,"gy":540,"d":"M780.9 934.4L793.6 934.4L793.6 947.2L832.0 947.2L832.0 960.0L844.8 960.0L883.2 960.0L883.2 934.4L883.2 921.6L857.6 921.6L857.6 908.8L844.8 908.8L844.8 883.2L832.0 883.2L832.0 870.4L806.4 870.4L806.4 908.8L793.6 908.8L793.6 921.6L780.9 921.6Z"},{"id":"b579_501","type":"base","x":821.8,"y":1021.4,"gx":579,"gy":501,"d":"M844.8 1049.6L844.8 1062.4L857.6 1062.4L857.6 1075.2L870.4 1075.2L870.4 1088.0L883.2 1088.0L883.2 1062.4L896.0 1062.4L896.0 1036.8L883.2 1036.8L883.2 1024.0L883.2 1011.2L870.4 1011.2L870.4 998.4L857.6 998.4L832.0 998.4L832.0 985.6L806.4 985.6L806.4 998.4L768.0 998.4L768.0 985.6L742.5 985.6L742.5 1011.2L755.2 1011.2L755.2 1039.4L768.0 1039.4L768.0 1024.0L793.6 1024.0L793.6 1039.4L806.4 1039.4L806.4 1049.6Z"},{"id":"b588_482","type":"base","x":798.8,"y":1070.1,"gx":588,"gy":482,"d":"M742.5 1090.5L768.0 1090.5L768.0 1100.8L803.9 1100.8L819.2 1100.8L819.2 1088.0L832.0 1088.0L832.0 1075.2L844.8 1075.2L844.8 1062.4L844.8 1049.6L806.4 1049.6L806.4 1039.4L793.6 1039.4L793.6 1024.0L768.0 1024.0L768.0 1039.4L755.2 1039.4L755.2 1065.0L742.5 1065.0Z"},{"id":"b515_610","type":"base","x":985.6,"y":742.5,"gx":515,"gy":610,"d":"M983.0 811.6L1021.4 811.6L1021.4 786.0L1008.6 786.0L1008.6 770.6L1021.4 770.6L1021.4 760.4L1011.2 760.4L1011.2 742.5L998.4 742.5L998.4 716.9L972.8 716.9L972.8 704.1L960.0 704.1L960.0 691.3L947.2 691.3L947.2 678.5L934.4 678.5L934.4 691.3L934.4 716.9L960.0 716.9L960.0 755.2L972.8 755.2L972.8 793.6L960.0 793.6L960.0 806.4L983.0 806.4Z"},{"id":"b604_463","type":"base","x":757.8,"y":1118.7,"gx":604,"gy":463,"d":"M742.5 1090.5L716.9 1090.5L716.9 1118.7L704.1 1118.7L704.1 1126.4L716.9 1126.4L716.9 1139.2L727.1 1139.2L727.1 1152.0L755.2 1152.0L755.2 1167.3L768.0 1167.3L778.3 1167.3L778.3 1152.0L791.1 1152.0L791.1 1141.7L791.1 1126.4L803.9 1126.4L803.9 1100.8L768.0 1100.8L768.0 1090.5Z"},{"id":"b469_439","type":"base","x":1103.3,"y":1180.1,"gx":469,"gy":439,"d":"M1149.4 1103.3L1136.6 1103.3L1136.6 1113.6L1123.8 1113.6L1123.8 1128.9L1113.6 1128.9L1113.6 1113.6L1085.4 1113.6L1072.6 1113.6L1072.6 1126.4L1072.6 1144.3L1059.8 1144.3L1059.8 1157.1L1085.4 1157.1L1085.4 1169.9L1072.6 1169.9L1072.6 1182.7L1085.4 1182.7L1085.4 1218.5L1072.6 1218.5L1072.6 1231.3L1098.2 1231.3L1123.8 1231.3L1123.8 1244.1L1136.6 1244.1L1136.6 1218.5L1136.6 1192.9L1123.8 1192.9L1123.8 1180.1L1136.6 1180.1L1136.6 1144.3L1149.4 1144.3L1149.4 1128.9L1162.2 1128.9L1162.2 1116.1L1149.4 1116.1Z"},{"id":"b541_439","type":"base","x":919.1,"y":1180.1,"gx":541,"gy":439,"d":"M970.2 1256.9L970.2 1244.1L983.0 1244.1L983.0 1233.9L995.9 1233.9L995.9 1221.1L995.9 1208.3L983.0 1208.3L983.0 1190.4L972.8 1190.4L972.8 1177.6L960.0 1177.6L960.0 1152.0L947.2 1152.0L947.2 1139.2L908.8 1139.2L908.8 1164.8L896.0 1164.8L896.0 1180.1L880.7 1180.1L880.7 1192.9L893.5 1192.9L893.5 1221.1L906.3 1221.1L919.1 1221.1L919.1 1231.3L931.9 1231.3L931.9 1244.1L944.7 1244.1L944.7 1256.9L957.5 1256.9Z"},{"id":"b517_458","type":"base","x":980.5,"y":1131.5,"gx":517,"gy":458,"d":"M1018.9 1090.5L1018.9 1080.3L1008.6 1080.3L1008.6 1062.4L985.6 1062.4L985.6 1075.2L972.8 1075.2L972.8 1088.0L960.0 1088.0L960.0 1100.8L947.2 1100.8L947.2 1113.6L921.6 1113.6L921.6 1126.4L908.8 1126.4L908.8 1139.2L947.2 1139.2L947.2 1152.0L960.0 1152.0L960.0 1177.6L972.8 1177.6L972.8 1190.4L983.0 1190.4L983.0 1182.7L995.9 1182.7L995.9 1157.1L1008.6 1157.1L1008.6 1144.3L1024.0 1144.3L1024.0 1118.7L1034.2 1118.7L1034.2 1090.5Z"},{"id":"b560_455","type":"base","x":870.4,"y":1139.2,"gx":560,"gy":455,"d":"M855.1 1180.1L880.7 1180.1L896.0 1180.1L896.0 1164.8L908.8 1164.8L908.8 1139.2L908.8 1126.4L896.0 1126.4L896.0 1100.8L883.2 1100.8L883.2 1088.0L870.4 1088.0L870.4 1075.2L857.6 1075.2L857.6 1062.4L844.8 1062.4L844.8 1075.2L832.0 1075.2L832.0 1088.0L819.2 1088.0L819.2 1100.8L803.9 1100.8L803.9 1126.4L791.1 1126.4L791.1 1141.7L829.5 1141.7L829.5 1152.0L844.8 1152.0L844.8 1164.8L855.1 1164.8Z"},{"id":"b542_514","type":"base","x":916.5,"y":988.2,"gx":542,"gy":514,"d":"M983.0 1016.3L983.0 998.4L972.8 998.4L972.8 985.6L960.0 985.6L960.0 972.8L947.2 972.8L947.2 960.0L934.4 960.0L934.4 947.2L908.8 947.2L908.8 934.4L883.2 934.4L883.2 960.0L844.8 960.0L844.8 972.8L857.6 972.8L857.6 998.4L870.4 998.4L870.4 1011.2L883.2 1011.2L883.2 1024.0L896.0 1024.0L896.0 1011.2L921.6 1011.2L921.6 1024.0L947.2 1024.0L947.2 1036.8L970.2 1036.8L970.2 1016.3Z"},{"id":"b546_477","type":"base","x":906.3,"y":1082.9,"gx":546,"gy":477,"d":"M970.2 1049.6L970.2 1036.8L947.2 1036.8L947.2 1024.0L921.6 1024.0L921.6 1011.2L896.0 1011.2L896.0 1024.0L883.2 1024.0L883.2 1036.8L896.0 1036.8L896.0 1062.4L883.2 1062.4L883.2 1088.0L883.2 1100.8L896.0 1100.8L896.0 1126.4L908.8 1126.4L921.6 1126.4L921.6 1113.6L947.2 1113.6L947.2 1100.8L960.0 1100.8L960.0 1088.0L972.8 1088.0L972.8 1075.2L985.6 1075.2L985.6 1062.4L985.6 1049.6Z"},{"id":"g1","type":"gate","n":1,"x":1144.3,"y":716.9,"gx":453,"gy":620,"d":null},{"id":"g2","type":"gate","n":2,"x":1269.7,"y":788.5,"gx":404,"gy":592,"d":null},{"id":"g3","type":"gate","n":3,"x":1320.9,"y":919.1,"gx":384,"gy":541,"d":null},{"id":"g4","type":"gate","n":4,"x":1269.7,"y":1082.9,"gx":404,"gy":477,"d":null},{"id":"g5","type":"gate","n":5,"x":1297.9,"y":1249.2,"gx":393,"gy":412,"d":null},{"id":"g6","type":"gate","n":6,"x":1167.3,"y":1336.3,"gx":444,"gy":378,"d":null},{"id":"g7","type":"gate","n":7,"x":898.6,"y":1328.6,"gx":549,"gy":381,"d":null},{"id":"g8","type":"gate","n":8,"x":783.4,"y":1239.0,"gx":594,"gy":416,"d":null},{"id":"g9","type":"gate","n":9,"x":719.4,"y":1085.4,"gx":619,"gy":476,"d":null},{"id":"g10","type":"gate","n":10,"x":760.4,"y":929.3,"gx":603,"gy":537,"d":null},{"id":"g11","type":"gate","n":11,"x":798.8,"y":775.7,"gx":588,"gy":597,"d":null},{"id":"g12","type":"gate","n":12,"x":911.4,"y":683.6,"gx":544,"gy":633,"d":null}];
const VB0 = { x: 668, y: 642, w: 712, h: 754 };
const fmt = (n) => n.toLocaleString("en-US");
const NAME = (f) =>
  f.type === "temple" ? "Temple of Corruption" :
  f.type === "sanct" ? "Sanctuary" :
  f.type === "gate" ? `Gate ${f.n}` : "Lv.3 Base";

export default function TempleWarPlanner() {
  const [alliances, setAlliances] = useState([]);
  const [own, setOwn] = useState({});
  const [active, setActive] = useState(null);
  const [draft, setDraft] = useState("");
  const [colorEdit, setColorEdit] = useState(null);
  const [status, setStatus] = useState(null);
  const [tip, setTip] = useState(null);
  const [vb, setVb] = useState(VB0);
  const [loaded, setLoaded] = useState(false);
  const saveT = useRef(null);
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const ptrs = useRef(new Map());
  const moved = useRef(false);
  const pinch = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(KEY);
        if (r?.value) {
          const d = JSON.parse(r.value);
          if (d.alliances?.length) setAlliances(d.alliances);
          if (d.own) setOwn(d.own);
          if (d.active) setActive(d.active);
        }
      } catch (e) { /* first run */ }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => {
      window.storage.set(KEY, JSON.stringify({ alliances, own, active })).catch(() => {});
    }, 700);
    return () => clearTimeout(saveT.current);
  }, [alliances, own, active, loaded]);

  /* ── pan / zoom ─────────────────────────────────────────── */
  const clientToSvg = useCallback((cx, cy) => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: vb.x + ((cx - r.left) / r.width) * vb.w, y: vb.y + ((cy - r.top) / r.height) * vb.h };
  }, [vb]);
  const zoomAt = useCallback((cx, cy, factor) => {
    setVb((v) => {
      const r = svgRef.current.getBoundingClientRect();
      const px = (cx - r.left) / r.width, py = (cy - r.top) / r.height;
      let w = Math.min(VB0.w * 1.35, Math.max(VB0.w / 7, v.w * factor));
      const h = w * (VB0.h / VB0.w);
      return { x: v.x + px * (v.w - w), y: v.y + py * (v.h - h), w, h };
    });
  }, []);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 1.14 : 1 / 1.14); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);
  const onPointerDown = (e) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!ptrs.current.has(e.pointerId)) return;
    const prev = ptrs.current.get(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 1) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
      const r = svgRef.current.getBoundingClientRect();
      setVb((v) => ({ ...v, x: v.x - dx * (v.w / r.width), y: v.y - dy * (v.h / r.height) }));
    } else if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current) {
        moved.current = true;
        zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.current / d);
      }
      pinch.current = d;
    }
  };
  const onPointerUp = (e) => {
    const wasPinch = ptrs.current.size > 1;
    ptrs.current.delete(e.pointerId);
    pinch.current = null;
    if (moved.current || wasPinch) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const fid = el?.closest?.("[data-fid]")?.getAttribute("data-fid");
    if (fid) {
      const f = FEATS.find((q) => q.id === fid);
      if (f) claim(f);
    }
  };

  /* ── claims ─────────────────────────────────────────────── */
  const claim = useCallback((f) => {
    if (!active) { setStatus(alliances.length ? "Select an alliance first" : "Add an alliance to start claiming"); return; }
    setOwn((o) => {
      const next = { ...o };
      if (active === "erase" || o[f.id] === active) {
        delete next[f.id];
        setStatus(`${NAME(f)} released`);
      } else if (active) {
        next[f.id] = active;
        const al = alliances.find((a) => a.id === active);
        setStatus(`${NAME(f)} → ${al?.name} · +${fmt(PTS[f.type])}`);
      }
      return next;
    });
  }, [active, alliances]);
  const colorOf = (fid) => alliances.find((a) => a.id === own[fid])?.color ?? null;

  const totals = useMemo(() => {
    const t = Object.fromEntries(alliances.map((a) => [a.id, { gate: 0, base: 0, sanct: 0, temple: 0, pts: 0 }]));
    FEATS.forEach((f) => { const aid = own[f.id]; if (aid && t[aid]) { t[aid][f.type]++; t[aid].pts += PTS[f.type]; } });
    return t;
  }, [own, alliances]);
  const nBases = FEATS.filter((f) => f.type === "base").length;
  const totalAvail = 12 * PTS.gate + nBases * PTS.base + 2 * PTS.sanct + PTS.temple;
  const claimed = Object.values(totals).reduce((s, t) => s + t.pts, 0);

  const addAlliance = () => {
    const name = draft.trim(); if (!name) return;
    const id = "a" + Date.now();
    setAlliances((a) => [...a, { id, name, color: COLORS[a.length % COLORS.length] }]);
    setActive(id); setDraft("");
  };
  const removeAlliance = (id) => {
    setAlliances((a) => a.filter((x) => x.id !== id));
    setOwn((o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== id)));
    if (active === id) setActive("erase");
  };
  const hover = (f, e) => {
    if (!e || ptrs.current.size) return setTip(null);
    const r = wrapRef.current.getBoundingClientRect();
    setTip({ f, x: e.clientX - r.left, y: e.clientY - r.top });
  };

  // coordinate rulers: game units → svg px (X left, Y up)
  const gxToPx = (g) => AX - (g - 500) * PPU;
  const gyToPx = (g) => AY - (g - 500) * PPU;
  const ticks = useMemo(() => {
    const uSpan = vb.w / PPU;
    const step = [10, 20, 25, 50, 100].find((s) => (s / uSpan) * 100 >= 9) ?? 100;
    const gxMax = 500 - (vb.x - AX) / PPU, gxMin = gxMax - uSpan;
    const gyMax = 500 - (vb.y - AY) / PPU, gyMin = 500 - (vb.y + vb.h - AY) / PPU;
    const xs = [], ys = [];
    for (let g = Math.ceil(gxMin / step) * step; g <= gxMax; g += step)
      xs.push({ g, p: ((gxToPx(g) - vb.x) / vb.w) * 100 });
    for (let g = Math.ceil(gyMin / step) * step; g <= gyMax; g += step)
      ys.push({ g, p: ((gyToPx(g) - vb.y) / vb.h) * 100 });
    return { xs, ys };
  }, [vb]);

  const C = { bg: "#0C0D10", panel: "#14151A", line: "#23252C", text: "#E8EAEF", mut: "#8B90A0", faint: "#565B69", tile: "#1C1E24", tileLine: "#2F323B" };
  const num = { fontVariantNumeric: "tabular-nums" };
  const strokeFor = (c) => (c ? "rgba(0,0,0,0.35)" : C.tileLine);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Inter, -apple-system, 'Segoe UI', system-ui, sans-serif", padding: "24px 18px 56px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        .terr{cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent}
        .terr:hover .tf{filter:brightness(1.22)} .tf{transition:filter .1s,fill .15s}
        .row{transition:background .12s} .row:hover{background:#191B21}
        .zbtn{width:30px;height:30px;border-radius:8px;border:1px solid #2C2F37;background:#17181D;color:#C9CCD6;font-size:15px;cursor:pointer;display:grid;place-items:center}
        input:focus{border-color:#3B4050!important} button{font-family:inherit}
        @media(prefers-reduced-motion:reduce){.tf,.row{transition:none}}`}</style>

      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: C.faint, marginBottom: 4 }}>TEMPLE WAR</div>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: "-0.015em" }}>Zone 3 · Territory Planner</h1>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 18, flexWrap: "wrap" }}>
            {[["Gates ×12", PTS.gate], [`Bases ×${nBases}`, PTS.base], ["Sanctuaries ×2", PTS.sanct], ["Temple", PTS.temple]].map(([n, p]) => (
              <div key={n}>
                <div style={{ fontSize: 11, color: C.faint }}>{n}</div>
                <div style={{ fontSize: 14, fontWeight: 600, ...num }}>{fmt(p)}<span style={{ color: C.faint, fontWeight: 400 }}> pts</span></div>
              </div>
            ))}
          </div>
        </header>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
          {/* ── Map ── */}
          <div ref={wrapRef} style={{ flex: "1.6 1 400px", minWidth: 320, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: 8, position: "relative", overflow: "hidden" }}>
            <svg ref={svgRef} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
              style={{ width: "100%", display: "block", borderRadius: 10, touchAction: "none", background: "#0F1013" }}
              onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onPointerLeave={() => setTip(null)}>
              {/* faint coordinate grid */}
              {ticks.xs.map((t) => (
                <line key={"gx" + t.g} x1={gxToPx(t.g)} y1={vb.y} x2={gxToPx(t.g)} y2={vb.y + vb.h} stroke="#FFFFFF" strokeOpacity="0.045" strokeWidth={vb.w / 700} pointerEvents="none" />
              ))}
              {ticks.ys.map((t) => (
                <line key={"gy" + t.g} x1={vb.x} y1={gyToPx(t.g)} x2={vb.x + vb.w} y2={gyToPx(t.g)} stroke="#FFFFFF" strokeOpacity="0.045" strokeWidth={vb.w / 700} pointerEvents="none" />
              ))}
              {/* drawn territories */}
              {FEATS.filter((f) => f.d).map((f) => {
                const c = colorOf(f.id);
                const base = f.type === "temple" ? "#262117" : f.type === "sanct" ? "#1E2028" : C.tile;
                return (
                  <g key={f.id} className="terr" data-fid={f.id}
                    onMouseMove={(e) => hover(f, e)} onMouseLeave={() => setTip(null)}>
                    <path className="tf" d={f.d} fill={c ?? base} fillOpacity={c ? 0.9 : 1} stroke={strokeFor(c)} strokeWidth="1.1" strokeLinejoin="round" />
                  </g>
                );
              })}
              {/* gates */}
              {FEATS.filter((f) => f.type === "gate").map((f) => {
                const c = colorOf(f.id);
                return (
                  <g key={f.id} className="terr" data-fid={f.id}
                    onMouseMove={(e) => hover(f, e)} onMouseLeave={() => setTip(null)}>
                    <circle className="tf" cx={f.x} cy={f.y} r="15" fill={c ?? "#181A20"} fillOpacity={c ? 0.95 : 1} stroke={c ?? "#3A3E48"} strokeWidth="1.3" />
                    <path d={`M${f.x - 5.5} ${f.y + 4.5}v-6.5m11 6.5v-6.5M${f.x - 7.2} ${f.y - 2.6}h14.4M${f.x - 5.8} ${f.y - 5.4}h11.6`}
                      stroke={c ? "#FFF" : "#9CA1AF"} strokeWidth="1.5" fill="none" strokeLinecap="round" pointerEvents="none" />
                    <text x={f.x} y={f.y + 12} textAnchor="middle" fontSize="6.5" fontWeight="600" fill={c ? "rgba(255,255,255,0.9)" : "#565B69"} pointerEvents="none">{f.n}</text>
                  </g>
                );
              })}
              {/* structure marks on drawn faces */}
              {FEATS.filter((f) => f.d).map((f) => {
                const c = colorOf(f.id), ink = c ? "#FFF" : "#9CA1AF";
                if (f.type === "base") return <circle key={f.id + "m"} cx={f.x} cy={f.y} r="3.4" fill={c ? "rgba(255,255,255,0.85)" : "#4A4F5C"} pointerEvents="none" />;
                if (f.type === "sanct") return <path key={f.id + "m"} d={`M${f.x} ${f.y - 9}l9 9-9 9-9-9Z`} fill="none" stroke={ink} strokeWidth="2.4" pointerEvents="none" />;
                return (
                  <g key={f.id + "m"} pointerEvents="none">
                    <circle cx={f.x} cy={f.y} r="14" fill="none" stroke={c ? "#FFF" : "#E8C15A"} strokeWidth="2.6" />
                    <circle cx={f.x} cy={f.y} r="4.6" fill={c ? "#FFF" : "#E8C15A"} />
                  </g>
                );
              })}
            </svg>

            {/* coordinate rulers */}
            <div style={{ position: "absolute", top: 8, left: 8, right: 8, height: 20, pointerEvents: "none", background: "linear-gradient(rgba(12,13,16,0.85), rgba(12,13,16,0))", borderRadius: "10px 10px 0 0" }}>
              {ticks.xs.map((t) => (
                <span key={t.g} style={{ position: "absolute", left: `${t.p}%`, top: 3, transform: "translateX(-50%)", fontSize: 10, color: "#6B7080", fontVariantNumeric: "tabular-nums" }}>{t.g}</span>
              ))}
            </div>
            <div style={{ position: "absolute", top: 8, left: 8, bottom: 46, width: 26, pointerEvents: "none", background: "linear-gradient(90deg, rgba(12,13,16,0.85), rgba(12,13,16,0))", borderRadius: "10px 0 0 10px" }}>
              {ticks.ys.map((t) => (
                <span key={t.g} style={{ position: "absolute", top: `${t.p}%`, left: 3, transform: "translateY(-50%)", fontSize: 10, color: "#6B7080", fontVariantNumeric: "tabular-nums" }}>{t.g}</span>
              ))}
            </div>
            {/* zoom controls */}
            <div style={{ position: "absolute", right: 16, bottom: 52, display: "flex", flexDirection: "column", gap: 6 }}>
              <button className="zbtn" onClick={() => { const r = svgRef.current.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.3); }}>+</button>
              <button className="zbtn" onClick={() => { const r = svgRef.current.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.3); }}>−</button>
              <button className="zbtn" style={{ fontSize: 11 }} onClick={() => setVb(VB0)}>⤢</button>
            </div>

            {/* tooltip */}
            {tip && (
              <div style={{ position: "absolute", left: Math.min(tip.x + 14, (wrapRef.current?.clientWidth ?? 400) - 190), top: tip.y + 14, pointerEvents: "none", background: "rgba(10,11,14,0.92)", border: `1px solid #2C2F37`, borderRadius: 10, padding: "9px 12px", minWidth: 150, backdropFilter: "blur(6px)" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{NAME(tip.f)}</div>
                <div style={{ fontSize: 11.5, color: C.mut, marginTop: 2, ...num }}>({tip.f.gx}, {tip.f.gy}) · {fmt(PTS[tip.f.type])} pts</div>
                <div style={{ fontSize: 11.5, marginTop: 4, color: colorOf(tip.f.id) ?? C.faint }}>
                  {own[tip.f.id] ? (alliances.find((a) => a.id === own[tip.f.id])?.name ?? "—") : "Unclaimed"}
                </div>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 10px 6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: C.faint }}>Scroll / pinch to zoom · drag to pan</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: status ? C.mut : C.faint, ...num }}>{status ?? "Tap territories to claim"}</span>
            </div>
          </div>

          {/* ── Rail ── */}
          <div style={{ flex: "1 1 300px", minWidth: 292, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px 10px", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: C.faint }}>STANDINGS</div>
              {alliances.length === 0 && (
                <div style={{ padding: "18px 16px 20px", borderTop: `1px solid ${C.line}`, fontSize: 12.5, color: C.mut, lineHeight: 1.55 }}>
                  No alliances yet. Add the first one below, then tap territories on the map to assign them.
                </div>
              )}
              {[...alliances].sort((a, b) => totals[b.id].pts - totals[a.id].pts).map((a, rank) => {
                const t = totals[a.id], sel = active === a.id;
                return (
                  <div key={a.id} className="row" onClick={() => setActive(a.id)}
                    style={{ padding: "11px 16px 12px", cursor: "pointer", background: sel ? "#1A1C22" : "transparent", boxShadow: sel ? `inset 3px 0 0 ${a.color}` : "none", borderTop: `1px solid ${C.line}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11, color: C.faint, width: 14, ...num }}>{rank + 1}</span>
                      <span onClick={(e) => { e.stopPropagation(); setColorEdit((c) => (c === a.id ? null : a.id)); }} title="Change color"
                        style={{ width: 13, height: 13, borderRadius: 999, background: a.color, flexShrink: 0, cursor: "pointer", border: "2px solid rgba(255,255,255,0.15)" }} />
                      <span style={{ fontWeight: 600, fontSize: 14, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                      <span style={{ fontWeight: 700, fontSize: 15, ...num }}>{fmt(t.pts)}</span>
                      <span onClick={(e) => { e.stopPropagation(); removeAlliance(a.id); }}
                        style={{ color: C.faint, fontSize: 16, lineHeight: 1, cursor: "pointer", padding: "0 2px" }} aria-label={`Remove ${a.name}`}>×</span>
                    </div>
                    <div style={{ display: "flex", fontSize: 11.5, color: C.mut, margin: "5px 0 7px 24px", ...num }}>
                      <span style={{ flex: 1 }}>{t.gate}G · {t.base}B · {t.sanct}S{t.temple ? " · Temple" : ""}</span>
                      <span style={{ color: t.pts >= CAP ? a.color : C.faint }}>{fmt(Math.min(t.pts, CAP))} / {fmt(CAP)}{t.pts >= CAP ? " · max" : ""}</span>
                    </div>
                    <div style={{ height: 3, background: "#21232A", borderRadius: 2, marginLeft: 24 }}>
                      <div style={{ height: 3, width: `${Math.min(100, (t.pts / CAP) * 100)}%`, background: a.color, borderRadius: 2, transition: "width .25s" }} />
                    </div>
                    {colorEdit === a.id && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0 2px 24px", maxWidth: 224 }} onClick={(e) => e.stopPropagation()}>
                        {COLORS.map((c, ci) => (
                          <span key={c} title={COLOR_NAMES[ci]}
                            onClick={() => { setAlliances((al) => al.map((x) => (x.id === a.id ? { ...x, color: c } : x))); setColorEdit(null); }}
                            style={{ width: 20, height: 20, borderRadius: 5, background: c, cursor: "pointer",
                              boxShadow: a.color === c ? "0 0 0 2px #E8EAEF" : "inset 0 0 0 1px rgba(255,255,255,0.14)" }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="row" onClick={() => setActive("erase")}
                style={{ padding: "11px 16px", cursor: "pointer", fontSize: 12.5, color: active === "erase" ? C.text : C.mut, borderTop: `1px solid ${C.line}`, background: active === "erase" ? "#1A1C22" : "transparent", boxShadow: active === "erase" ? `inset 3px 0 0 ${C.faint}` : "none" }}>
                Release mode
              </div>
              <div style={{ display: "flex", gap: 8, padding: 14, borderTop: `1px solid ${C.line}` }}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addAlliance()}
                  placeholder="Add alliance"
                  style={{ flex: 1, background: "#0F1013", border: `1px solid #2C2F37`, borderRadius: 9, padding: "8px 12px", fontSize: 13.5, color: C.text, outline: "none" }} />
                <button onClick={addAlliance}
                  style={{ background: "#E8EAEF", color: "#0F1013", border: "none", borderRadius: 9, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add</button>
              </div>
            </div>

            <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: C.faint, marginBottom: 8 }}>ZONE TOTAL</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 24, fontWeight: 700, ...num }}>{fmt(claimed)}</span>
                <span style={{ fontSize: 13, color: C.mut, ...num }}>/ {fmt(totalAvail)} pts claimed</span>
              </div>
              <div style={{ height: 4, background: "#21232A", borderRadius: 2, margin: "12px 0 14px" }}>
                <div style={{ height: 4, width: `${(claimed / totalAvail) * 100}%`, background: "#E8EAEF", borderRadius: 2, transition: "width .25s" }} />
              </div>
              <div style={{ fontSize: 11.5, color: C.faint, lineHeight: 1.55, marginBottom: 12 }}>
                Full map from your traced SVG — 46 bordered territories plus 12 gates. Coordinates are approximate, anchored at the temple (500, 500).
              </div>
              <button onClick={() => { setOwn({}); setStatus("All claims cleared"); }}
                style={{ background: "transparent", color: "#FF7A7A", border: `1px solid #3A2A2C`, borderRadius: 9, padding: "7px 14px", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>
                Clear all claims
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
