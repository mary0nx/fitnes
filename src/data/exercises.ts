import type { Category, Exercise, L, Muscle } from '../domain/types';

const x = (ru: string, pl: string): L => ({ ru, pl });

export const CATEGORY_NAMES: Record<Category, L> = {
  legs: x('Ноги и ягодицы', 'Nogi i pośladki'),
  abs: x('Пресс', 'Brzuch'),
  arms: x('Руки и плечи', 'Ręce i barki'),
  back: x('Спина', 'Plecy'),
  chest: x('Грудь', 'Klatka piersiowa'),
  cardio: x('Кардио и растяжка', 'Kardio i rozciąganie'),
  yoga: x('Йога', 'Joga'),
};
export const CATEGORY_SHORT: Record<Category, L> = {
  legs: x('Ноги', 'Nogi'), abs: x('Пресс', 'Brzuch'), arms: x('Руки', 'Ręce'),
  back: x('Спина', 'Plecy'), chest: x('Грудь', 'Klatka'), cardio: x('Кардио', 'Kardio'), yoga: x('Йога', 'Joga'),
};
export const CATEGORIES: Category[] = ['legs', 'abs', 'arms', 'back', 'chest', 'cardio', 'yoga'];

export const MUSCLE_NAMES: Record<Muscle, L> = {
  glutes: x('Ягодичные', 'Pośladki'),
  quads: x('Квадрицепсы', 'Czworogłowe uda'),
  hamstrings: x('Бицепс бедра', 'Dwugłowe uda'),
  calves: x('Икры', 'Łydki'),
  adductors: x('Приводящие', 'Przywodziciele'),
  abs: x('Пресс', 'Mięśnie brzucha'),
  obliques: x('Косые мышцы', 'Mięśnie skośne'),
  lowerBack: x('Поясница', 'Dolny odcinek pleców'),
  lats: x('Широчайшие', 'Najszersze grzbietu'),
  traps: x('Трапеции', 'Czworoboczne'),
  chest: x('Грудные', 'Mięśnie piersiowe'),
  shoulders: x('Плечи', 'Barki'),
  biceps: x('Бицепс', 'Biceps'),
  triceps: x('Трицепс', 'Triceps'),
  forearms: x('Предплечья', 'Przedramiona'),
  heart: x('Сердце и выносливость', 'Serce i wytrzymałość'),
};

export const EQUIPMENT_NAMES = {
  none: x('Без оборудования', 'Bez sprzętu'),
  mat: x('Коврик', 'Mata'),
  dumbbells: x('Гантели', 'Hantle'),
  barbell: x('Штанга', 'Sztanga'),
  bench: x('Скамья', 'Ławka'),
  machine: x('Тренажёр', 'Maszyna'),
  cable: x('Блочный тренажёр', 'Wyciąg'),
  cardio: x('Кардиотренажёр', 'Maszyna kardio'),
} as const;

/** Стабилизаторы по упражнениям (третий уровень подсветки на модели). */
const STABILIZERS: Record<string, Muscle[]> = {
  barbell_squat: ['abs', 'calves'], hack_squat: ['calves', 'abs'], goblet_squat: ['lowerBack', 'calves'], squat_bw: ['lowerBack', 'calves'],
  bulgarian_split: ['calves', 'lowerBack'], lunge: ['lowerBack', 'obliques'], romanian_deadlift: ['abs', 'traps', 'lats'],
  glute_bridge: ['obliques', 'quads'], leg_press: ['calves'], kickback: ['abs', 'obliques'], leg_curl: ['lowerBack'], leg_extension: ['abs'],
  crunch: [], plank: ['quads', 'traps'], leg_raise: ['adductors'], bicycle: ['adductors'], reverse_crunch: ['lowerBack'],
  shoulder_press: ['abs', 'lowerBack'], front_raise: ['abs', 'forearms'], lateral_raise: ['abs', 'forearms'],
  triceps_extension: ['abs', 'forearms'], biceps_curl: ['shoulders', 'abs'],
  lat_pulldown: ['shoulders', 'abs'], seated_row: ['shoulders', 'abs'], dumbbell_row: ['shoulders', 'abs', 'lowerBack'], hyperextension: ['abs'],
  dumbbell_bench_press: ['abs', 'forearms'], chest_press_machine: ['forearms'], pushup: ['lowerBack', 'quads'], dumbbell_fly: ['biceps', 'forearms'],
  walking: ['abs'], running: ['abs', 'shoulders'], bike: ['abs'], elliptical: ['abs'], stretch_forward: [], stretch_side: ['abs'],
  sumo_squat: ['abs', 'calves'], calf_raise: ['abs'], donkey_kick: ['abs', 'shoulders'], superman: ['traps'],
  mountain_climber: ['triceps', 'glutes'], side_plank: ['adductors', 'quads'], jumping_jacks: ['abs'],
  downward_dog: ['abs', 'quads'], cobra: ['shoulders'], child_pose: [], warrior2: ['abs', 'calves'], tree_pose: ['obliques', 'quads'], cat_cow: ['shoulders'],
};

const RAW: Omit<Exercise, 'stabilizers'>[] = [
  /* ================= НОГИ И ЯГОДИЦЫ ================= */
  {
    id: 'barbell_squat', name: x('Приседания со штангой', 'Przysiady ze sztangą'), category: 'legs',
    primary: ['glutes', 'quads'], secondary: ['hamstrings', 'adductors', 'lowerBack'],
    equipment: ['barbell'], places: ['gym'], level: 2, kind: 'strength', anim: 'barbell_squat', met: 5.5,
    avoid: ['knees', 'back'], startKg: [15, 25, 40],
    technique: [
      x('Спина прямая, корпус слегка наклонён вперёд', 'Plecy proste, tułów lekko pochylony do przodu'),
      x('Колени по направлению стоп, без завала внутрь', 'Kolana w linii stóp, nie schodzą się do środka'),
      x('Опускайся до параллели или чуть ниже', 'Schodź do równoległości ud lub nieco niżej'),
      x('Поднимайся за счёт ягодиц и ног, без рывков', 'Wstawaj siłą pośladków i nóg, bez szarpnięć'),
    ],
    mistakes: [
      x('Округление спины', 'Zaokrąglanie pleców'),
      x('Сведение коленей внутрь', 'Schodzenie kolan do środka'),
      x('Слишком маленькая амплитуда', 'Zbyt mały zakres ruchu'),
      x('Отрыв пяток от пола', 'Odrywanie pięt od podłogi'),
    ],
    alternatives: ['goblet_squat', 'hack_squat', 'leg_press', 'bulgarian_split'],
  },
  {
    id: 'hack_squat', name: x('Гак-присед', 'Hack przysiad'), category: 'legs',
    primary: ['quads', 'glutes'], secondary: ['hamstrings', 'adductors'],
    equipment: ['machine'], places: ['gym'], level: 2, kind: 'strength', anim: 'hack_squat', met: 5,
    avoid: ['knees'], startKg: [20, 40, 60],
    technique: [
      x('Плотно прижми спину и таз к спинке', 'Dociśnij plecy i biodra do oparcia'),
      x('Стопы на ширине плеч, носки слегка развёрнуты', 'Stopy na szerokość barków, palce lekko na zewnątrz'),
      x('Опускайся плавно до угла в коленях около 90°', 'Opuszczaj się płynnie do kąta ok. 90° w kolanach'),
      x('Выжимай платформу пятками, не выпрямляя колени до упора', 'Wypychaj piętami, nie blokuj kolan w górze'),
    ],
    mistakes: [
      x('Отрыв поясницы от спинки', 'Odrywanie lędźwi od oparcia'),
      x('Сведение коленей', 'Schodzenie kolan do środka'),
      x('Резкое выпрямление ног', 'Gwałtowne prostowanie nóg'),
    ],
    alternatives: ['leg_press', 'barbell_squat', 'goblet_squat'],
  },
  {
    id: 'goblet_squat', name: x('Приседания с гантелями', 'Przysiady z hantlami'), category: 'legs',
    primary: ['glutes', 'quads'], secondary: ['hamstrings', 'abs'],
    equipment: ['dumbbells'], places: ['home', 'gym'], level: 1, kind: 'strength', anim: 'goblet_squat', met: 5,
    avoid: ['knees'], startKg: [4, 8, 12],
    technique: [
      x('Держи гантели у плеч, локти направлены вниз', 'Trzymaj hantle przy barkach, łokcie w dół'),
      x('Отводи таз назад, будто садишься на стул', 'Cofaj biodra, jakbyś siadała na krześle'),
      x('Вес распределён по всей стопе', 'Ciężar rozłożony na całej stopie'),
      x('В верхней точке напряги ягодицы', 'W górze napnij pośladki'),
    ],
    mistakes: [
      x('Наклон корпуса слишком вперёд', 'Zbyt mocne pochylenie tułowia'),
      x('Колени заваливаются внутрь', 'Kolana schodzą się do środka'),
      x('Подъём на носки', 'Wspinanie się na palce'),
    ],
    alternatives: ['squat_bw', 'barbell_squat', 'lunge', 'leg_press'],
  },
  {
    id: 'squat_bw', name: x('Приседания без веса', 'Przysiady bez obciążenia'), category: 'legs',
    primary: ['glutes', 'quads'], secondary: ['hamstrings', 'abs'],
    equipment: ['none'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'bodyweight', anim: 'squat_bw', met: 4.5,
    technique: [
      x('Стопы чуть шире плеч, носки слегка наружу', 'Stopy nieco szerzej niż barki, palce lekko na zewnątrz'),
      x('Вытягивай руки вперёд для баланса', 'Wyciągaj ręce przed siebie dla równowagi'),
      x('Опускайся до параллели бёдер с полом', 'Schodź do równoległości ud z podłogą'),
      x('Спина прямая, взгляд вперёд', 'Plecy proste, wzrok przed siebie'),
    ],
    mistakes: [
      x('Пятки отрываются от пола', 'Pięty odrywają się od podłogi'),
      x('Округляется поясница', 'Zaokrągla się odcinek lędźwiowy'),
      x('Слишком быстрый темп', 'Zbyt szybkie tempo'),
    ],
    alternatives: ['goblet_squat', 'lunge', 'glute_bridge'],
  },
  {
    id: 'bulgarian_split', name: x('Болгарские выпады', 'Przysiady bułgarskie'), category: 'legs',
    primary: ['glutes', 'quads'], secondary: ['hamstrings', 'adductors', 'abs'],
    equipment: ['dumbbells', 'bench'], places: ['home', 'gym'], level: 2, kind: 'strength', anim: 'bulgarian_split', met: 5.5,
    avoid: ['knees'], startKg: [3, 6, 10],
    technique: [
      x('Задняя стопа лежит на скамье, передняя — далеко впереди', 'Tylna stopa na ławce, przednia daleko z przodu'),
      x('Опускайся вертикально вниз, корпус слегка наклонён', 'Schodź pionowo w dół, tułów lekko pochylony'),
      x('Колено передней ноги смотрит по линии носка', 'Kolano przedniej nogi w linii palców'),
      x('Отталкивайся пяткой передней ноги', 'Odpychaj się piętą przedniej nogi'),
    ],
    mistakes: [
      x('Слишком короткий шаг', 'Zbyt krótki krok'),
      x('Колено уходит внутрь', 'Kolano ucieka do środka'),
      x('Толчок задней ногой', 'Odpychanie się tylną nogą'),
    ],
    alternatives: ['lunge', 'goblet_squat', 'leg_press'],
  },
  {
    id: 'lunge', name: x('Выпады', 'Wykroki'), category: 'legs',
    primary: ['glutes', 'quads'], secondary: ['hamstrings', 'calves', 'abs'],
    equipment: ['none'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'bodyweight', anim: 'lunge', met: 4.5,
    avoid: ['knees'],
    technique: [
      x('Сделай широкий шаг, руки на поясе', 'Zrób szeroki krok, dłonie na biodrach'),
      x('Опускайся, пока оба колена не согнутся до 90°', 'Schodź, aż oba kolana zegną się do 90°'),
      x('Корпус держи вертикально', 'Tułów trzymaj pionowo'),
      x('После всех повторов поменяй ногу', 'Po wszystkich powtórzeniach zmień nogę'),
    ],
    mistakes: [
      x('Колено передней ноги выходит далеко за носок', 'Kolano przedniej nogi wychodzi daleko przed palce'),
      x('Удар задним коленом об пол', 'Uderzanie tylnym kolanem o podłogę'),
      x('Наклон корпуса вперёд', 'Pochylanie tułowia do przodu'),
    ],
    alternatives: ['squat_bw', 'bulgarian_split', 'glute_bridge'],
  },
  {
    id: 'romanian_deadlift', name: x('Румынская тяга', 'Martwy ciąg rumuński'), category: 'legs',
    primary: ['hamstrings', 'glutes'], secondary: ['lowerBack', 'forearms'],
    equipment: ['dumbbells'], places: ['home', 'gym'], level: 2, kind: 'strength', anim: 'romanian_deadlift', met: 5,
    avoid: ['back'], startKg: [5, 10, 16],
    technique: [
      x('Колени слегка согнуты и зафиксированы', 'Kolana lekko ugięte i zablokowane w tej pozycji'),
      x('Отводи таз назад, спина остаётся прямой', 'Cofaj biodra, plecy pozostają proste'),
      x('Гантели скользят вдоль ног до середины голени', 'Hantle prowadź wzdłuż nóg do połowy piszczeli'),
      x('Поднимайся, выталкивая таз вперёд', 'Wstawaj, wypychając biodra do przodu'),
    ],
    mistakes: [
      x('Округление спины', 'Zaokrąglanie pleców'),
      x('Сгибание коленей, как в приседе', 'Uginanie kolan jak w przysiadzie'),
      x('Гантели далеко от ног', 'Hantle daleko od nóg'),
    ],
    alternatives: ['glute_bridge', 'hyperextension', 'leg_curl'],
  },
  {
    id: 'glute_bridge', name: x('Ягодичный мостик', 'Mostek biodrowy'), category: 'legs',
    primary: ['glutes'], secondary: ['hamstrings', 'abs', 'lowerBack'],
    equipment: ['mat'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'bodyweight', anim: 'glute_bridge', met: 3.8,
    technique: [
      x('Лёжа на спине, стопы на ширине таза близко к ягодицам', 'Leżąc na plecach, stopy na szerokość bioder blisko pośladków'),
      x('Поднимай таз, отталкиваясь пятками', 'Unoś biodra, odpychając się piętami'),
      x('В верхней точке сожми ягодицы на 1–2 секунды', 'W górze ściśnij pośladki na 1–2 sekundy'),
      x('Опускайся медленно, не ложась полностью', 'Opuszczaj się powoli, nie kładąc się całkiem'),
    ],
    mistakes: [
      x('Прогиб в пояснице вместо работы ягодиц', 'Wyginanie lędźwi zamiast pracy pośladków'),
      x('Отрыв пяток от пола', 'Odrywanie pięt od podłogi'),
      x('Разведение коленей в стороны', 'Rozchodzenie się kolan na boki'),
    ],
    alternatives: ['romanian_deadlift', 'kickback', 'squat_bw'],
  },
  {
    id: 'leg_press', name: x('Жим ногами', 'Wypychanie nóg na suwnicy'), category: 'legs',
    primary: ['quads', 'glutes'], secondary: ['hamstrings', 'adductors'],
    equipment: ['machine'], places: ['gym'], level: 1, kind: 'strength', anim: 'leg_press', met: 5,
    startKg: [40, 80, 120],
    technique: [
      x('Поставь стопы на платформу на ширине плеч', 'Ustaw stopy na platformie na szerokość barków'),
      x('Опускай платформу, сгибая ноги до угла ~90°', 'Opuszczaj platformę, zginając nogi do kąta ok. 90°'),
      x('Выжимай вверх, не разгибая колени полностью', 'Wypychaj w górę, nie prostując kolan do końca'),
      x('Поясница всё время прижата к спинке', 'Lędźwie cały czas dociśnięte do oparcia'),
    ],
    mistakes: [
      x('Слишком низкое положение таза', 'Zbyt niskie położenie bioder'),
      x('Отрыв поясницы от спинки', 'Odrywanie lędźwi od oparcia'),
      x('Сведение коленей внутрь', 'Schodzenie kolan do środka'),
    ],
    alternatives: ['hack_squat', 'barbell_squat', 'goblet_squat'],
  },
  {
    id: 'kickback', name: x('Отведение ноги', 'Odwodzenie nogi w tył'), category: 'legs',
    primary: ['glutes'], secondary: ['hamstrings', 'lowerBack'],
    equipment: ['cable'], places: ['gym'], level: 1, kind: 'strength', anim: 'kickback', met: 3.8,
    startKg: [5, 10, 15],
    technique: [
      x('Держись за опору, корпус слегка наклонён', 'Trzymaj się podpory, tułów lekko pochylony'),
      x('Отводи ногу назад за счёт ягодицы', 'Odwodź nogę w tył siłą pośladka'),
      x('В крайней точке задержись на секунду', 'W końcowym punkcie zatrzymaj się na sekundę'),
      x('Возвращай ногу плавно, без маха', 'Wracaj płynnie, bez zamachu'),
    ],
    mistakes: [
      x('Прогиб в пояснице', 'Wyginanie lędźwi'),
      x('Мах ногой по инерции', 'Wymachiwanie nogą siłą rozpędu'),
      x('Разворот таза в сторону', 'Skręcanie bioder w bok'),
    ],
    alternatives: ['glute_bridge', 'bulgarian_split', 'romanian_deadlift'],
  },
  {
    id: 'leg_curl', name: x('Сгибание ног', 'Uginanie nóg leżąc'), category: 'legs',
    primary: ['hamstrings'], secondary: ['calves', 'glutes'],
    equipment: ['machine'], places: ['gym'], level: 1, kind: 'strength', anim: 'leg_curl', met: 3.8,
    startKg: [10, 20, 30],
    technique: [
      x('Ляг на тренажёр, валик — чуть выше пяток', 'Połóż się na maszynie, wałek tuż nad piętami'),
      x('Сгибай ноги, подтягивая валик к ягодицам', 'Zginaj nogi, przyciągając wałek do pośladków'),
      x('Таз прижат к скамье', 'Biodra dociśnięte do ławki'),
      x('Разгибай ноги медленно и подконтрольно', 'Prostuj nogi powoli i pod kontrolą'),
    ],
    mistakes: [
      x('Отрыв таза от скамьи', 'Odrywanie bioder od ławki'),
      x('Рывок в начале движения', 'Szarpnięcie na początku ruchu'),
      x('Неполная амплитуда', 'Niepełny zakres ruchu'),
    ],
    alternatives: ['romanian_deadlift', 'glute_bridge', 'hyperextension'],
  },
  {
    id: 'leg_extension', name: x('Разгибание ног', 'Prostowanie nóg siedząc'), category: 'legs',
    primary: ['quads'], secondary: [],
    equipment: ['machine'], places: ['gym'], level: 1, kind: 'strength', anim: 'leg_extension', met: 3.8,
    avoid: ['knees'], startKg: [10, 20, 30],
    technique: [
      x('Сядь плотно, колени на краю сиденья', 'Usiądź pewnie, kolana na krawędzi siedziska'),
      x('Разгибай ноги до почти прямых', 'Prostuj nogi prawie do końca'),
      x('В верхней точке напряги квадрицепсы', 'W górze napnij mięśnie czworogłowe'),
      x('Опускай вес плавно', 'Opuszczaj ciężar płynnie'),
    ],
    mistakes: [
      x('Бросок веса вниз', 'Puszczanie ciężaru w dół'),
      x('Отрыв таза от сиденья', 'Odrywanie bioder od siedziska'),
      x('Слишком большой вес и рывки', 'Zbyt duży ciężar i szarpanie'),
    ],
    alternatives: ['leg_press', 'goblet_squat', 'squat_bw'],
  },

  /* ================= ПРЕСС ================= */
  {
    id: 'crunch', name: x('Скручивания', 'Spięcia brzucha'), category: 'abs',
    primary: ['abs'], secondary: ['obliques'],
    equipment: ['mat'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'bodyweight', anim: 'crunch', met: 3.8,
    technique: [
      x('Лёжа на спине, колени согнуты, руки за головой', 'Leżąc na plecach, kolana ugięte, dłonie za głową'),
      x('Поднимай лопатки, скручивая корпус', 'Unoś łopatki, zwijając tułów'),
      x('Поясница остаётся на полу', 'Lędźwie pozostają na podłodze'),
      x('Выдох на подъёме, вдох на опускании', 'Wydech przy unoszeniu, wdech przy opuszczaniu'),
    ],
    mistakes: [
      x('Тянуть голову руками', 'Ciągnięcie głowy rękami'),
      x('Подъём всего корпуса рывком', 'Podnoszenie całego tułowia szarpnięciem'),
      x('Задержка дыхания', 'Wstrzymywanie oddechu'),
    ],
    alternatives: ['reverse_crunch', 'bicycle', 'plank'],
  },
  {
    id: 'plank', name: x('Планка', 'Deska (plank)'), category: 'abs',
    primary: ['abs'], secondary: ['obliques', 'shoulders', 'glutes', 'lowerBack'],
    equipment: ['mat'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'time', anim: 'plank', met: 3.5,
    technique: [
      x('Локти строго под плечами', 'Łokcie dokładnie pod barkami'),
      x('Тело — прямая линия от макушки до пяток', 'Ciało tworzy prostą linię od głowy do pięt'),
      x('Напряги пресс и ягодицы', 'Napnij brzuch i pośladki'),
      x('Дыши ровно, не задерживай дыхание', 'Oddychaj równo, nie wstrzymuj oddechu'),
    ],
    mistakes: [
      x('Провисание поясницы', 'Zapadanie się lędźwi'),
      x('Поднятый вверх таз', 'Uniesione biodra'),
      x('Запрокинутая или опущенная голова', 'Zadarta lub opuszczona głowa'),
    ],
    alternatives: ['crunch', 'leg_raise', 'reverse_crunch'],
  },
  {
    id: 'leg_raise', name: x('Подъём ног', 'Unoszenie nóg leżąc'), category: 'abs',
    primary: ['abs'], secondary: ['obliques', 'quads'],
    equipment: ['mat'], places: ['home', 'gym', 'outdoor'], level: 2, kind: 'bodyweight', anim: 'leg_raise', met: 3.8,
    avoid: ['back'],
    technique: [
      x('Лёжа на спине, руки вдоль тела', 'Leżąc na plecach, ręce wzdłuż ciała'),
      x('Поднимай прямые ноги до вертикали', 'Unoś proste nogi do pionu'),
      x('Опускай медленно, не касаясь пола', 'Opuszczaj powoli, nie dotykając podłogi'),
      x('Поясница прижата к коврику', 'Lędźwie dociśnięte do maty'),
    ],
    mistakes: [
      x('Прогиб в пояснице', 'Wyginanie lędźwi'),
      x('Бросок ног вниз', 'Opuszczanie nóg bez kontroli'),
      x('Раскачивание', 'Bujanie się'),
    ],
    alternatives: ['reverse_crunch', 'crunch', 'plank'],
  },
  {
    id: 'bicycle', name: x('Велосипед', 'Rowerek'), category: 'abs',
    primary: ['abs', 'obliques'], secondary: ['quads'],
    equipment: ['mat'], places: ['home', 'gym', 'outdoor'], level: 2, kind: 'bodyweight', anim: 'bicycle', met: 4.5,
    technique: [
      x('Лопатки приподняты, руки за головой', 'Łopatki uniesione, dłonie za głową'),
      x('Тянись локтем к противоположному колену', 'Sięgaj łokciem do przeciwnego kolana'),
      x('Вторая нога выпрямляется над полом', 'Druga noga prostuje się nad podłogą'),
      x('Двигайся плавно, без спешки', 'Ruszaj się płynnie, bez pośpiechu'),
    ],
    mistakes: [
      x('Тянуть шею руками', 'Ciągnięcie szyi rękami'),
      x('Слишком быстрый темп', 'Zbyt szybkie tempo'),
      x('Поясница отрывается от пола', 'Lędźwie odrywają się od podłogi'),
    ],
    alternatives: ['crunch', 'reverse_crunch', 'plank'],
  },
  {
    id: 'reverse_crunch', name: x('Обратные скручивания', 'Odwrotne spięcia brzucha'), category: 'abs',
    primary: ['abs'], secondary: ['obliques'],
    equipment: ['mat'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'bodyweight', anim: 'reverse_crunch', met: 3.8,
    technique: [
      x('Лёжа на спине, ноги согнуты под 90°', 'Leżąc na plecach, nogi zgięte pod kątem 90°'),
      x('Подтягивай колени к груди, отрывая таз', 'Przyciągaj kolana do klatki, odrywając biodra'),
      x('Движение за счёт пресса, а не маха', 'Ruch siłą brzucha, nie zamachem'),
      x('Плавно возвращайся в исходное положение', 'Płynnie wracaj do pozycji wyjściowej'),
    ],
    mistakes: [
      x('Мах ногами по инерции', 'Wymachiwanie nogami siłą rozpędu'),
      x('Напряжение шеи', 'Napinanie szyi'),
      x('Слишком маленькая амплитуда', 'Zbyt mały zakres ruchu'),
    ],
    alternatives: ['leg_raise', 'crunch', 'bicycle'],
  },

  /* ================= РУКИ И ПЛЕЧИ ================= */
  {
    id: 'shoulder_press', name: x('Жим гантелей сидя', 'Wyciskanie hantli siedząc'), category: 'arms',
    primary: ['shoulders'], secondary: ['triceps', 'traps'],
    equipment: ['dumbbells', 'bench'], places: ['home', 'gym'], level: 2, kind: 'strength', anim: 'shoulder_press', met: 4.5,
    avoid: ['shoulders'], startKg: [3, 5, 8],
    technique: [
      x('Сядь ровно, спина прижата к спинке', 'Usiądź prosto, plecy dociśnięte do oparcia'),
      x('Гантели на уровне ушей, локти под кистями', 'Hantle na wysokości uszu, łokcie pod nadgarstkami'),
      x('Выжимай вверх, не разгибая локти до щелчка', 'Wyciskaj w górę, nie blokując łokci'),
      x('Опускай плавно до исходного положения', 'Opuszczaj płynnie do pozycji wyjściowej'),
    ],
    mistakes: [
      x('Прогиб в пояснице', 'Wyginanie lędźwi'),
      x('Сведение гантелей с ударом', 'Zderzanie hantli w górze'),
      x('Слишком глубокое опускание локтей', 'Zbyt głębokie opuszczanie łokci'),
    ],
    alternatives: ['lateral_raise', 'front_raise', 'pushup'],
  },
  {
    id: 'front_raise', name: x('Подъём гантелей перед собой', 'Unoszenie hantli w przód'), category: 'arms',
    primary: ['shoulders'], secondary: ['traps', 'chest'],
    equipment: ['dumbbells'], places: ['home', 'gym'], level: 1, kind: 'strength', anim: 'front_raise', met: 3.8,
    avoid: ['shoulders'], startKg: [2, 3, 5],
    technique: [
      x('Стой ровно, гантели перед бёдрами', 'Stań prosto, hantle przed udami'),
      x('Поднимай руки до уровня плеч', 'Unoś ręce do wysokości barków'),
      x('Локти слегка согнуты', 'Łokcie lekko ugięte'),
      x('Опускай медленнее, чем поднимаешь', 'Opuszczaj wolniej, niż unosisz'),
    ],
    mistakes: [
      x('Раскачивание корпусом', 'Bujanie tułowiem'),
      x('Подъём выше уровня плеч', 'Unoszenie powyżej barków'),
      x('Слишком тяжёлые гантели', 'Zbyt ciężkie hantle'),
    ],
    alternatives: ['lateral_raise', 'shoulder_press'],
  },
  {
    id: 'lateral_raise', name: x('Разведение гантелей в стороны', 'Unoszenie hantli bokiem'), category: 'arms',
    primary: ['shoulders'], secondary: ['traps'],
    equipment: ['dumbbells'], places: ['home', 'gym'], level: 1, kind: 'strength', anim: 'lateral_raise', met: 3.8,
    startKg: [2, 3, 5],
    technique: [
      x('Руки вдоль тела, локти чуть согнуты', 'Ręce wzdłuż ciała, łokcie lekko ugięte'),
      x('Разводи руки в стороны до уровня плеч', 'Unoś ręce bokiem do wysokości barków'),
      x('Локоть ведёт движение, кисть не выше локтя', 'Łokieć prowadzi ruch, dłoń nie wyżej niż łokieć'),
      x('Опускай подконтрольно', 'Opuszczaj pod kontrolą'),
    ],
    mistakes: [
      x('Подъём плеч к ушам', 'Unoszenie barków do uszu'),
      x('Мах за счёт корпуса', 'Zamach tułowiem'),
      x('Полностью прямые руки', 'Całkowicie proste ręce'),
    ],
    alternatives: ['front_raise', 'shoulder_press'],
  },
  {
    id: 'triceps_extension', name: x('Разгибание рук', 'Prostowanie ramion nad głową'), category: 'arms',
    primary: ['triceps'], secondary: ['shoulders'],
    equipment: ['dumbbells'], places: ['home', 'gym'], level: 1, kind: 'strength', anim: 'triceps_extension', met: 3.8,
    avoid: ['shoulders'], startKg: [3, 5, 8],
    technique: [
      x('Держи гантель двумя руками над головой', 'Trzymaj hantel oburącz nad głową'),
      x('Локти смотрят вверх и прижаты к голове', 'Łokcie skierowane w górę, blisko głowy'),
      x('Опускай гантель за голову, сгибая локти', 'Opuszczaj hantel za głowę, zginając łokcie'),
      x('Разгибай руки, не двигая плечами', 'Prostuj ręce, nie ruszając barkami'),
    ],
    mistakes: [
      x('Разведение локтей в стороны', 'Rozchodzenie się łokci na boki'),
      x('Прогиб в пояснице', 'Wyginanie lędźwi'),
      x('Слишком быстрый темп', 'Zbyt szybkie tempo'),
    ],
    alternatives: ['pushup', 'shoulder_press'],
  },
  {
    id: 'biceps_curl', name: x('Сгибание рук', 'Uginanie ramion z hantlami'), category: 'arms',
    primary: ['biceps'], secondary: ['forearms'],
    equipment: ['dumbbells'], places: ['home', 'gym'], level: 1, kind: 'strength', anim: 'biceps_curl', met: 3.8,
    startKg: [3, 5, 8],
    technique: [
      x('Локти прижаты к корпусу', 'Łokcie przy tułowiu'),
      x('Сгибай руки, поднимая гантели к плечам', 'Zginaj ręce, unosząc hantle do barków'),
      x('В верхней точке напряги бицепс', 'W górze napnij biceps'),
      x('Опускай медленно до почти прямых рук', 'Opuszczaj powoli do prawie prostych rąk'),
    ],
    mistakes: [
      x('Раскачивание корпусом', 'Bujanie tułowiem'),
      x('Локти уходят вперёд', 'Łokcie uciekają do przodu'),
      x('Бросок гантелей вниз', 'Opuszczanie hantli bez kontroli'),
    ],
    alternatives: ['dumbbell_row', 'lat_pulldown'],
  },

  /* ================= СПИНА ================= */
  {
    id: 'lat_pulldown', name: x('Тяга верхнего блока', 'Ściąganie drążka wyciągu górnego'), category: 'back',
    primary: ['lats'], secondary: ['biceps', 'traps', 'forearms'],
    equipment: ['cable'], places: ['gym'], level: 1, kind: 'strength', anim: 'lat_pulldown', met: 4.5,
    startKg: [15, 25, 35],
    technique: [
      x('Возьмись за гриф чуть шире плеч', 'Chwyć drążek nieco szerzej niż barki'),
      x('Слегка отклонись назад, грудь вперёд', 'Lekko odchyl się w tył, klatka do przodu'),
      x('Тяни гриф к верхней части груди, сводя лопатки', 'Ściągaj drążek do górnej części klatki, ściągając łopatki'),
      x('Возвращай гриф вверх плавно', 'Wracaj drążkiem w górę płynnie'),
    ],
    mistakes: [
      x('Тяга за голову', 'Ściąganie za głowę'),
      x('Раскачивание корпусом', 'Bujanie tułowiem'),
      x('Тяга одними руками без спины', 'Ciągnięcie samymi rękami bez pleców'),
    ],
    alternatives: ['dumbbell_row', 'seated_row'],
  },
  {
    id: 'seated_row', name: x('Горизонтальная тяга', 'Przyciąganie wyciągu dolnego siedząc'), category: 'back',
    primary: ['lats', 'traps'], secondary: ['biceps', 'lowerBack', 'forearms'],
    equipment: ['cable'], places: ['gym'], level: 1, kind: 'strength', anim: 'seated_row', met: 4.5,
    startKg: [15, 25, 35],
    technique: [
      x('Сядь ровно, колени слегка согнуты', 'Usiądź prosto, kolana lekko ugięte'),
      x('Тяни рукоять к животу, локти вдоль корпуса', 'Przyciągaj uchwyt do brzucha, łokcie przy tułowiu'),
      x('В конце движения сведи лопатки', 'Na końcu ruchu ściągnij łopatki'),
      x('Возвращай рукоять, не округляя спину', 'Wracaj uchwytem, nie zaokrąglając pleców'),
    ],
    mistakes: [
      x('Сильное раскачивание корпусом', 'Mocne bujanie tułowiem'),
      x('Округление спины', 'Zaokrąglanie pleców'),
      x('Подъём плеч к ушам', 'Unoszenie barków do uszu'),
    ],
    alternatives: ['dumbbell_row', 'lat_pulldown'],
  },
  {
    id: 'dumbbell_row', name: x('Тяга гантели', 'Wiosłowanie hantlem'), category: 'back',
    primary: ['lats'], secondary: ['traps', 'biceps', 'forearms'],
    equipment: ['dumbbells', 'bench'], places: ['home', 'gym'], level: 1, kind: 'strength', anim: 'dumbbell_row', met: 4.5,
    startKg: [4, 8, 12],
    technique: [
      x('Обопрись рукой о скамью, спина параллельна полу', 'Oprzyj dłoń o ławkę, plecy równolegle do podłogi'),
      x('Тяни гантель к поясу, локоть вдоль корпуса', 'Przyciągaj hantel do biodra, łokieć przy tułowiu'),
      x('В верхней точке сведи лопатку', 'W górze ściągnij łopatkę'),
      x('После всех повторов поменяй руку', 'Po wszystkich powtórzeniach zmień rękę'),
    ],
    mistakes: [
      x('Округление спины', 'Zaokrąglanie pleców'),
      x('Разворот корпуса за гантелью', 'Skręcanie tułowia za hantlem'),
      x('Рывок весом', 'Szarpanie ciężarem'),
    ],
    alternatives: ['seated_row', 'lat_pulldown', 'hyperextension'],
  },
  {
    id: 'hyperextension', name: x('Гиперэкстензия', 'Prostowanie tułowia na ławce'), category: 'back',
    primary: ['lowerBack', 'glutes'], secondary: ['hamstrings'],
    equipment: ['machine'], places: ['gym'], level: 1, kind: 'bodyweight', anim: 'hyperextension', met: 3.8,
    avoid: ['back'],
    technique: [
      x('Упор — в верхнюю часть бёдер, таз свободен', 'Podparcie na górnej części ud, biodra swobodne'),
      x('Наклоняйся вниз с прямой спиной', 'Pochylaj się w dół z prostymi plecami'),
      x('Поднимайся до прямой линии тела', 'Unoś się do prostej linii ciała'),
      x('Не переразгибайся в верхней точке', 'Nie przeprostowuj się w górze'),
    ],
    mistakes: [
      x('Переразгибание в пояснице', 'Przeprost w odcinku lędźwiowym'),
      x('Рывки и раскачивание', 'Szarpanie i bujanie'),
      x('Округление спины внизу', 'Zaokrąglanie pleców na dole'),
    ],
    alternatives: ['glute_bridge', 'romanian_deadlift', 'plank'],
  },

  /* ================= ГРУДЬ ================= */
  {
    id: 'dumbbell_bench_press', name: x('Жим гантелей лёжа', 'Wyciskanie hantli leżąc'), category: 'chest',
    primary: ['chest'], secondary: ['triceps', 'shoulders'],
    equipment: ['dumbbells', 'bench'], places: ['home', 'gym'], level: 2, kind: 'strength', anim: 'dumbbell_bench_press', met: 4.5,
    avoid: ['shoulders'], startKg: [4, 7, 10],
    technique: [
      x('Лопатки сведены, стопы плотно на полу', 'Łopatki ściągnięte, stopy pewnie na podłodze'),
      x('Опускай гантели к краям груди', 'Opuszczaj hantle do boków klatki'),
      x('Локти под углом ~45–60° к корпусу', 'Łokcie pod kątem ok. 45–60° do tułowia'),
      x('Выжимай вверх, слегка сводя гантели', 'Wyciskaj w górę, lekko zbliżając hantle'),
    ],
    mistakes: [
      x('Отрыв таза от скамьи', 'Odrywanie bioder od ławki'),
      x('Локти разведены под 90°', 'Łokcie rozstawione pod kątem 90°'),
      x('Бросок гантелей вниз', 'Opuszczanie hantli bez kontroli'),
    ],
    alternatives: ['pushup', 'chest_press_machine', 'dumbbell_fly'],
  },
  {
    id: 'chest_press_machine', name: x('Жим в тренажёре', 'Wyciskanie na maszynie'), category: 'chest',
    primary: ['chest'], secondary: ['triceps', 'shoulders'],
    equipment: ['machine'], places: ['gym'], level: 1, kind: 'strength', anim: 'chest_press_machine', met: 4,
    startKg: [10, 20, 30],
    technique: [
      x('Настрой сиденье: рукояти на уровне середины груди', 'Ustaw siedzisko: uchwyty na wysokości środka klatki'),
      x('Спина и лопатки прижаты к спинке', 'Plecy i łopatki dociśnięte do oparcia'),
      x('Выжимай рукояти вперёд на выдохе', 'Wypychaj uchwyty do przodu na wydechu'),
      x('Возвращайся плавно, не бросая вес', 'Wracaj płynnie, nie puszczając ciężaru'),
    ],
    mistakes: [
      x('Отрыв лопаток от спинки', 'Odrywanie łopatek od oparcia'),
      x('Полное выпрямление локтей с ударом', 'Gwałtowne blokowanie łokci'),
      x('Подъём плеч', 'Unoszenie barków'),
    ],
    alternatives: ['dumbbell_bench_press', 'pushup', 'dumbbell_fly'],
  },
  {
    id: 'pushup', name: x('Отжимания', 'Pompki'), category: 'chest',
    primary: ['chest'], secondary: ['triceps', 'shoulders', 'abs'],
    equipment: ['none'], places: ['home', 'gym', 'outdoor'], level: 2, kind: 'bodyweight', anim: 'pushup', met: 4.5,
    avoid: ['shoulders'],
    technique: [
      x('Ладони чуть шире плеч, тело — прямая линия', 'Dłonie nieco szerzej niż barki, ciało w prostej linii'),
      x('Опускайся, сгибая локти под углом ~45°', 'Opuszczaj się, zginając łokcie pod kątem ok. 45°'),
      x('Грудь почти касается пола', 'Klatka prawie dotyka podłogi'),
      x('Если тяжело — отжимайся с колен', 'Jeśli jest ciężko — rób pompki na kolanach'),
    ],
    mistakes: [
      x('Провисание таза', 'Zapadanie się bioder'),
      x('Локти разведены в стороны', 'Łokcie rozstawione szeroko na boki'),
      x('Неполная амплитуда', 'Niepełny zakres ruchu'),
    ],
    alternatives: ['dumbbell_bench_press', 'chest_press_machine', 'plank'],
  },
  {
    id: 'dumbbell_fly', name: x('Разведение гантелей лёжа', 'Rozpiętki z hantlami'), category: 'chest',
    primary: ['chest'], secondary: ['shoulders'],
    equipment: ['dumbbells', 'bench'], places: ['home', 'gym'], level: 2, kind: 'strength', anim: 'dumbbell_fly', met: 4,
    avoid: ['shoulders'], startKg: [2, 4, 6],
    technique: [
      x('Руки над грудью, локти слегка согнуты', 'Ręce nad klatką, łokcie lekko ugięte'),
      x('Разводи руки в стороны по широкой дуге', 'Rozkładaj ręce na boki szerokim łukiem'),
      x('Опускай до лёгкого растяжения груди', 'Opuszczaj do lekkiego rozciągnięcia klatki'),
      x('Своди руки, будто обнимаешь дерево', 'Zbliżaj ręce, jakbyś obejmowała drzewo'),
    ],
    mistakes: [
      x('Слишком глубокое опускание', 'Zbyt głębokie opuszczanie'),
      x('Выпрямленные локти', 'Wyprostowane łokcie'),
      x('Слишком тяжёлые гантели', 'Zbyt ciężkie hantle'),
    ],
    alternatives: ['dumbbell_bench_press', 'chest_press_machine', 'pushup'],
  },

  /* ================= КАРДИО И РАСТЯЖКА ================= */
  {
    id: 'walking', name: x('Ходьба', 'Marsz'), category: 'cardio',
    primary: ['heart'], secondary: ['glutes', 'calves', 'quads'],
    equipment: ['none'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'cardio', anim: 'walking', met: 3.8,
    technique: [
      x('Держи спину прямо, плечи расслаблены', 'Trzymaj plecy prosto, barki rozluźnione'),
      x('Ставь стопу с пятки на носок', 'Stawiaj stopę od pięty do palców'),
      x('Руки согнуты и работают в такт шагам', 'Ręce ugięte, pracują w rytm kroków'),
      x('Темп — можешь говорить, но чуть сбивается дыхание', 'Tempo — możesz mówić, ale oddech lekko przyspiesza'),
    ],
    mistakes: [
      x('Сутулость', 'Garbienie się'),
      x('Взгляд под ноги', 'Wzrok wbity w ziemię'),
      x('Слишком длинный шаг', 'Zbyt długi krok'),
    ],
    alternatives: ['elliptical', 'bike', 'running'],
  },
  {
    id: 'running', name: x('Бег', 'Bieg'), category: 'cardio',
    primary: ['heart'], secondary: ['quads', 'calves', 'glutes', 'hamstrings'],
    equipment: ['none'], places: ['gym', 'outdoor'], level: 2, kind: 'cardio', anim: 'running', met: 8,
    avoid: ['knees'],
    technique: [
      x('Корпус слегка наклонён вперёд', 'Tułów lekko pochylony do przodu'),
      x('Приземляйся на середину стопы под собой', 'Ląduj na śródstopiu pod środkiem ciała'),
      x('Локти согнуты под 90°, плечи расслаблены', 'Łokcie zgięte pod kątem 90°, barki rozluźnione'),
      x('Начинай в лёгком темпе, дыши ритмично', 'Zaczynaj w lekkim tempie, oddychaj rytmicznie'),
    ],
    mistakes: [
      x('Удар пяткой далеко впереди', 'Lądowanie na pięcie daleko z przodu'),
      x('Слишком быстрый старт', 'Zbyt szybki start'),
      x('Зажатые плечи', 'Spięte barki'),
    ],
    alternatives: ['walking', 'elliptical', 'bike'],
  },
  {
    id: 'bike', name: x('Велотренажёр', 'Rower stacjonarny'), category: 'cardio',
    primary: ['heart'], secondary: ['quads', 'glutes', 'calves'],
    equipment: ['cardio'], places: ['gym'], level: 1, kind: 'cardio', anim: 'bike', met: 6.5,
    technique: [
      x('Настрой седло: нога внизу почти прямая', 'Ustaw siodełko: noga na dole prawie prosta'),
      x('Спина ровная, плечи расслаблены', 'Plecy proste, barki rozluźnione'),
      x('Крути педали плавно, по кругу', 'Pedałuj płynnie, okrężnym ruchem'),
      x('Держи комфортный, ровный темп', 'Utrzymuj wygodne, równe tempo'),
    ],
    mistakes: [
      x('Слишком низкое седло', 'Zbyt niskie siodełko'),
      x('Колени разведены в стороны', 'Kolana rozchodzą się na boki'),
      x('Сутулая спина', 'Zgarbione plecy'),
    ],
    alternatives: ['elliptical', 'walking', 'running'],
  },
  {
    id: 'elliptical', name: x('Эллипс', 'Orbitrek'), category: 'cardio',
    primary: ['heart'], secondary: ['quads', 'glutes', 'hamstrings', 'shoulders'],
    equipment: ['cardio'], places: ['gym'], level: 1, kind: 'cardio', anim: 'elliptical', met: 5.5,
    technique: [
      x('Стопы полностью стоят на педалях', 'Stopy całe na pedałach'),
      x('Корпус вертикально, взгляд вперёд', 'Tułów pionowo, wzrok przed siebie'),
      x('Руки работают вместе с ногами', 'Ręce pracują razem z nogami'),
      x('Двигайся плавно, без рывков', 'Ruszaj się płynnie, bez szarpnięć'),
    ],
    mistakes: [
      x('Опора всем весом на рукояти', 'Opieranie całego ciężaru na uchwytach'),
      x('Подъём на носки', 'Wspinanie się na palce'),
      x('Сильный наклон вперёд', 'Mocne pochylenie do przodu'),
    ],
    alternatives: ['bike', 'walking', 'running'],
  },
  {
    id: 'stretch_forward', name: x('Растяжка: наклон к ногам', 'Rozciąganie: skłon do nóg'), category: 'cardio',
    primary: ['hamstrings'], secondary: ['lowerBack', 'calves'],
    equipment: ['mat'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'time', anim: 'stretch_forward', met: 2.3,
    technique: [
      x('Сядь, ноги прямые перед собой', 'Usiądź, nogi proste przed sobą'),
      x('Тянись руками к стопам, наклоняясь от бёдер', 'Sięgaj dłońmi do stóp, pochylając się od bioder'),
      x('Задержись в комфортном натяжении', 'Zatrzymaj się w przyjemnym rozciągnięciu'),
      x('Дыши спокойно, с выдохом расслабляйся глубже', 'Oddychaj spokojnie, z wydechem rozluźniaj się głębiej'),
    ],
    mistakes: [
      x('Пружинящие рывки', 'Sprężynujące szarpnięcia'),
      x('Растяжка через боль', 'Rozciąganie przez ból'),
      x('Задержка дыхания', 'Wstrzymywanie oddechu'),
    ],
    alternatives: ['stretch_side', 'walking'],
  },
  {
    id: 'stretch_side', name: x('Растяжка: боковые наклоны', 'Rozciąganie: skłony boczne'), category: 'cardio',
    primary: ['obliques'], secondary: ['lats', 'shoulders'],
    equipment: ['none'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'time', anim: 'stretch_side', met: 2.3,
    technique: [
      x('Стопы шире плеч, одна рука тянется вверх', 'Stopy szerzej niż barki, jedna ręka sięga w górę'),
      x('Наклоняйся в сторону, не заваливаясь вперёд', 'Pochylaj się w bok, nie przechylając się do przodu'),
      x('Почувствуй растяжение боковой поверхности', 'Poczuj rozciąganie boku tułowia'),
      x('Плавно меняй сторону', 'Płynnie zmieniaj stronę'),
    ],
    mistakes: [
      x('Наклон корпуса вперёд', 'Pochylanie tułowia do przodu'),
      x('Резкие движения', 'Gwałtowne ruchy'),
      x('Отрыв стопы от пола', 'Odrywanie stopy od podłogi'),
    ],
    alternatives: ['stretch_forward', 'walking'],
  },
  /* ================= С СОБСТВЕННЫМ ВЕСОМ ================= */
  {
    id: 'sumo_squat', name: x('Сумо-приседания', 'Przysiady sumo'), category: 'legs',
    primary: ['glutes', 'adductors'], secondary: ['quads', 'hamstrings'],
    equipment: ['none'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'bodyweight', anim: 'sumo_squat', met: 5,
    avoid: ['knees'],
    technique: [
      x('Широкая постановка стоп, носки развёрнуты наружу на 30–45°', 'Szeroki rozstaw stóp, palce skierowane na zewnątrz pod kątem 30–45°'),
      x('Опускайся вниз, разводя колени по линии носков', 'Opuszczaj się, kierując kolana w linii palców'),
      x('Корпус почти вертикальный, спина прямая', 'Tułów prawie pionowy, plecy proste'),
      x('Вставай, сжимая ягодицы и внутреннюю поверхность бёдер', 'Wstawaj, napinając pośladki i wewnętrzną część ud'),
    ],
    mistakes: [
      x('Колени сводятся внутрь', 'Kolana schodzą się do środka'),
      x('Наклон корпуса вперёд', 'Pochylanie tułowia do przodu'),
      x('Отрыв пяток от пола', 'Odrywanie pięt od podłogi'),
    ],
    alternatives: ['squat_bw', 'goblet_squat', 'lunge'],
  },
  {
    id: 'calf_raise', name: x('Подъём на носки', 'Wspięcia na palce'), category: 'legs',
    primary: ['calves'], secondary: [],
    equipment: ['none'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'bodyweight', anim: 'calf_raise', met: 3,
    technique: [
      x('Стопы на ширине таза, руки на поясе или у опоры', 'Stopy na szerokość bioder, dłonie na biodrach lub na podporze'),
      x('Поднимайся на носки как можно выше', 'Wspinaj się na palce jak najwyżej'),
      x('Задержись наверху на секунду', 'Zatrzymaj się na górze na sekundę'),
      x('Опускай пятки медленно, не бросая вес', 'Opuszczaj pięty powoli, bez opadania'),
    ],
    mistakes: [
      x('Заваливание стоп наружу или внутрь', 'Przechylanie stóp na zewnątrz lub do środka'),
      x('Слишком быстрый темп', 'Zbyt szybkie tempo'),
      x('Сгибание коленей', 'Uginanie kolan'),
    ],
    alternatives: ['walking', 'jumping_jacks', 'squat_bw'],
  },
  {
    id: 'donkey_kick', name: x('Махи ногой на четвереньках', 'Wykopy nogą w klęku podpartym'), category: 'legs',
    primary: ['glutes'], secondary: ['hamstrings'],
    equipment: ['mat'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'bodyweight', anim: 'donkey_kick', met: 3.8,
    technique: [
      x('Стань на четвереньки: ладони под плечами, колени под тазом', 'Klęk podparty: dłonie pod barkami, kolana pod biodrami'),
      x('Поднимай согнутую ногу стопой к потолку', 'Unoś zgiętą nogę stopą w stronę sufitu'),
      x('Наверху сожми ягодицу, бедро параллельно полу', 'Na górze napnij pośladek, udo równolegle do podłogi'),
      x('Сделай все повторы и смени ногу', 'Wykonaj wszystkie powtórzenia i zmień nogę'),
    ],
    mistakes: [
      x('Прогиб в пояснице', 'Wyginanie lędźwi'),
      x('Разворот таза в сторону', 'Skręcanie bioder w bok'),
      x('Мах по инерции', 'Wymach siłą rozpędu'),
    ],
    alternatives: ['glute_bridge', 'kickback', 'superman'],
  },
  {
    id: 'superman', name: x('Супермен', 'Superman'), category: 'back',
    primary: ['lowerBack'], secondary: ['glutes', 'hamstrings', 'shoulders'],
    equipment: ['mat'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'bodyweight', anim: 'superman', met: 3.5,
    avoid: ['back'],
    technique: [
      x('Ляг на живот, руки вытянуты вперёд', 'Połóż się na brzuchu, ręce wyciągnięte do przodu'),
      x('Одновременно подними руки, грудь и ноги', 'Jednocześnie unieś ręce, klatkę i nogi'),
      x('Взгляд в пол, шея продолжает линию спины', 'Wzrok w podłogę, szyja w linii kręgosłupa'),
      x('Задержись на 1–2 секунды и плавно опустись', 'Zatrzymaj się na 1–2 sekundy i płynnie opuść'),
    ],
    mistakes: [
      x('Запрокидывание головы', 'Zadzieranie głowy'),
      x('Рывки и раскачивание', 'Szarpanie i bujanie'),
      x('Слишком высокий подъём через боль в пояснице', 'Zbyt wysokie unoszenie mimo bólu lędźwi'),
    ],
    alternatives: ['hyperextension', 'cobra', 'glute_bridge'],
  },
  {
    id: 'mountain_climber', name: x('Скалолаз', 'Wspinaczka (mountain climber)'), category: 'abs',
    primary: ['abs'], secondary: ['shoulders', 'quads', 'heart'],
    equipment: ['mat'], places: ['home', 'gym', 'outdoor'], level: 2, kind: 'time', anim: 'mountain_climber', met: 8,
    avoid: ['shoulders'],
    technique: [
      x('Упор лёжа: ладони под плечами, тело прямое', 'Podpór przodem: dłonie pod barkami, ciało proste'),
      x('Поочерёдно подтягивай колени к груди', 'Na zmianę przyciągaj kolana do klatki'),
      x('Таз остаётся на уровне плеч, не поднимай его', 'Biodra na wysokości barków, nie unoś ich'),
      x('Дыши ритмично, держи темп, который можешь контролировать', 'Oddychaj rytmicznie, utrzymuj kontrolowane tempo'),
    ],
    mistakes: [
      x('Таз высоко вверху', 'Biodra wysoko w górze'),
      x('Плечи уходят за ладони', 'Barki uciekają za dłonie'),
      x('Стопа шлёпает по полу', 'Uderzanie stopą o podłogę'),
    ],
    alternatives: ['plank', 'bicycle', 'jumping_jacks'],
  },
  {
    id: 'side_plank', name: x('Боковая планка', 'Deska bokiem'), category: 'abs',
    primary: ['obliques'], secondary: ['abs', 'shoulders', 'glutes'],
    equipment: ['mat'], places: ['home', 'gym', 'outdoor'], level: 2, kind: 'time', anim: 'side_plank', met: 3.5,
    avoid: ['shoulders'],
    technique: [
      x('Локоть строго под плечом, предплечье на коврике', 'Łokieć dokładnie pod barkiem, przedramię na macie'),
      x('Тело — прямая линия от головы до стоп', 'Ciało w prostej linii od głowy do stóp'),
      x('Подними таз и удерживай его, не проваливаясь', 'Unieś biodra i utrzymaj je, nie opadając'),
      x('Верхнюю руку можно поднять к потолку', 'Górną rękę możesz unieść do sufitu'),
    ],
    mistakes: [
      x('Провисание таза', 'Opadanie bioder'),
      x('Корпус заваливается вперёд', 'Tułów przechyla się do przodu'),
      x('Плечо уходит к уху', 'Bark uciekający do ucha'),
    ],
    alternatives: ['plank', 'bicycle', 'crunch'],
  },
  {
    id: 'jumping_jacks', name: x('Прыжки «звёздочка»', 'Pajacyki'), category: 'cardio',
    primary: ['heart'], secondary: ['calves', 'shoulders', 'glutes', 'adductors'],
    equipment: ['none'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'time', anim: 'jumping_jacks', met: 8,
    avoid: ['knees'],
    technique: [
      x('Прыжком расставь ноги и подними руки над головой', 'W podskoku rozstaw nogi i unieś ręce nad głowę'),
      x('Следующим прыжком вернись в исходное положение', 'Kolejnym podskokiem wróć do pozycji wyjściowej'),
      x('Приземляйся мягко на носки, колени чуть согнуты', 'Ląduj miękko na palcach, kolana lekko ugięte'),
      x('Держи ровный ритм и дыши свободно', 'Utrzymuj równy rytm i oddychaj swobodnie'),
    ],
    mistakes: [
      x('Жёсткое приземление на прямые ноги', 'Twarde lądowanie na prostych nogach'),
      x('Колени сводятся внутрь при приземлении', 'Kolana schodzą się do środka przy lądowaniu'),
      x('Сутулая спина', 'Zgarbione plecy'),
    ],
    alternatives: ['walking', 'running', 'mountain_climber'],
  },

  /* ================= ЙОГА ================= */
  {
    id: 'downward_dog', name: x('Собака мордой вниз', 'Pies z głową w dół'), category: 'yoga',
    primary: ['hamstrings', 'calves', 'shoulders'], secondary: ['lats', 'triceps'],
    equipment: ['mat'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'time', anim: 'downward_dog', met: 2.8,
    avoid: ['shoulders'],
    technique: [
      x('Ладони на ширине плеч, пальцы широко расставлены', 'Dłonie na szerokość barków, palce szeroko rozstawione'),
      x('Подними таз вверх и назад — тело в форме буквы «Л»', 'Unieś biodra w górę i do tyłu — ciało w kształcie odwróconej litery „V”'),
      x('Спина вытянута, голова между руками', 'Plecy wyciągnięte, głowa między ramionami'),
      x('Тянись пятками к полу, колени можно слегка согнуть', 'Kieruj pięty do podłogi, kolana możesz lekko ugiąć'),
    ],
    mistakes: [
      x('Круглая спина', 'Okrągłe plecy'),
      x('Плечи прижаты к ушам', 'Barki przyciśnięte do uszu'),
      x('Вес только на руках', 'Ciężar tylko na dłoniach'),
    ],
    alternatives: ['child_pose', 'cat_cow', 'stretch_forward'],
  },
  {
    id: 'cobra', name: x('Кобра', 'Kobra'), category: 'yoga',
    primary: ['lowerBack'], secondary: ['glutes', 'triceps'],
    equipment: ['mat'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'time', anim: 'cobra', met: 2.5,
    technique: [
      x('Ляг на живот, ладони под плечами, локти прижаты к телу', 'Połóż się na brzuchu, dłonie pod barkami, łokcie przy tułowiu'),
      x('На вдохе плавно поднимай грудь, вытягиваясь вперёд и вверх', 'Na wdechu płynnie unieś klatkę, wydłużając się do przodu i w górę'),
      x('Таз и стопы остаются на коврике', 'Biodra i stopy pozostają na macie'),
      x('Плечи опущены, шея длинная', 'Barki opuszczone, szyja wydłużona'),
    ],
    mistakes: [
      x('Подъём за счёт рук с болью в пояснице', 'Unoszenie siłą rąk z bólem lędźwi'),
      x('Плечи подняты к ушам', 'Barki uniesione do uszu'),
      x('Сильно запрокинутая голова', 'Mocno odchylona głowa'),
    ],
    alternatives: ['superman', 'child_pose', 'cat_cow'],
  },
  {
    id: 'child_pose', name: x('Поза ребёнка', 'Pozycja dziecka'), category: 'yoga',
    primary: ['lowerBack', 'lats'], secondary: ['glutes', 'shoulders'],
    equipment: ['mat'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'time', anim: 'child_pose', met: 2,
    technique: [
      x('Сядь на пятки, колени чуть шире таза', 'Usiądź na piętach, kolana nieco szerzej niż biodra'),
      x('Наклонись вперёд и опусти грудь между бёдер', 'Pochyl się do przodu i opuść klatkę między uda'),
      x('Лоб на коврике, руки вытянуты вперёд', 'Czoło na macie, ręce wyciągnięte do przodu'),
      x('Дыши спокойно и расслабляй спину с каждым выдохом', 'Oddychaj spokojnie i rozluźniaj plecy z każdym wydechem'),
    ],
    mistakes: [
      x('Напряжённые плечи', 'Napięte barki'),
      x('Задержка дыхания', 'Wstrzymywanie oddechu'),
      x('Давление через боль в коленях — подложи подушку', 'Nacisk mimo bólu kolan — podłóż poduszkę'),
    ],
    alternatives: ['cat_cow', 'downward_dog', 'stretch_forward'],
  },
  {
    id: 'warrior2', name: x('Воин II', 'Wojownik II'), category: 'yoga',
    primary: ['quads', 'glutes'], secondary: ['adductors', 'shoulders'],
    equipment: ['mat'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'time', anim: 'warrior2', met: 3,
    avoid: ['knees'],
    technique: [
      x('Широко расставь ноги, переднюю стопу разверни наружу', 'Rozstaw szeroko nogi, przednią stopę obróć na zewnątrz'),
      x('Согни переднее колено над пяткой, бедро стремится к параллели', 'Ugnij przednie kolano nad piętą, udo dąży do równoległości'),
      x('Задняя нога прямая, стопа прижата к полу', 'Tylna noga prosta, stopa przyciśnięta do podłogi'),
      x('Руки в стороны на уровне плеч, взгляд над передней рукой', 'Ręce w bok na wysokości barków, wzrok nad przednią dłonią'),
    ],
    mistakes: [
      x('Колено уходит за носок или внутрь', 'Kolano wychodzi przed palce lub do środka'),
      x('Корпус наклоняется к передней ноге', 'Tułów przechyla się nad przednią nogę'),
      x('Опущенные руки и поднятые плечи', 'Opuszczone ręce i uniesione barki'),
    ],
    alternatives: ['lunge', 'tree_pose', 'sumo_squat'],
  },
  {
    id: 'tree_pose', name: x('Поза дерева', 'Pozycja drzewa'), category: 'yoga',
    primary: ['glutes', 'calves'], secondary: ['adductors', 'abs'],
    equipment: ['none'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'time', anim: 'tree_pose', met: 2.5,
    technique: [
      x('Перенеси вес на одну ногу, стопа плотно на полу', 'Przenieś ciężar na jedną nogę, stopa pewnie na podłodze'),
      x('Поставь стопу другой ноги на внутреннюю сторону бедра или голени', 'Postaw stopę drugiej nogi na wewnętrznej stronie uda lub łydki'),
      x('Колено отведи в сторону, таз ровный', 'Kolano skieruj w bok, biodra równo'),
      x('Ладони вместе у груди или над головой, взгляд в одну точку', 'Dłonie razem przy klatce lub nad głową, wzrok w jeden punkt'),
    ],
    mistakes: [
      x('Стопа давит на колено', 'Stopa naciska na kolano'),
      x('Таз уходит в сторону', 'Biodro ucieka w bok'),
      x('Задержка дыхания', 'Wstrzymywanie oddechu'),
    ],
    alternatives: ['warrior2', 'calf_raise', 'stretch_side'],
  },
  {
    id: 'cat_cow', name: x('Кошка-корова', 'Koci grzbiet'), category: 'yoga',
    primary: ['lowerBack', 'abs'], secondary: ['obliques', 'traps'],
    equipment: ['mat'], places: ['home', 'gym', 'outdoor'], level: 1, kind: 'time', anim: 'cat_cow', met: 2.3,
    technique: [
      x('Стань на четвереньки: ладони под плечами, колени под тазом', 'Klęk podparty: dłonie pod barkami, kolana pod biodrami'),
      x('На выдохе округли спину вверх, подбородок к груди', 'Na wydechu zaokrąglij plecy w górę, broda do klatki'),
      x('На вдохе мягко прогнись, грудь вперёд, взгляд вперёд', 'Na wdechu łagodnie wygnij plecy, klatka do przodu, wzrok przed siebie'),
      x('Двигайся плавно, в ритме дыхания', 'Poruszaj się płynnie, w rytmie oddechu'),
    ],
    mistakes: [
      x('Резкие движения', 'Gwałtowne ruchy'),
      x('Сгибание рук в локтях', 'Uginanie łokci'),
      x('Чрезмерный прогиб в пояснице', 'Nadmierne wygięcie lędźwi'),
    ],
    alternatives: ['child_pose', 'downward_dog', 'cobra'],
  },
];

export const EXERCISES: Exercise[] = RAW.map((e) => ({
  ...e,
  stabilizers: (STABILIZERS[e.id] ?? []).filter((m) => !e.primary.includes(m) && !e.secondary.includes(m)),
}));

export const EX_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
export const getExercise = (id: string): Exercise => EX_BY_ID[id] ?? EXERCISES[0];

const BASE = import.meta.env?.BASE_URL ?? './';
/** Миниатюра — пререндер той же 3D-анимации, поэтому всегда соответствует упражнению. */
export const thumbUrl = (id: string) => `${BASE}media/thumbs/${id}.webp`;
export const muscleUrl = (id: string, side: 'f' | 'b') => `${BASE}media/muscles/${id}-${side}.webp`;
export const mediaUrl = (name: string) => `${BASE}media/${name}.webp`;
