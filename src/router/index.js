import { createRouter, createWebHistory } from 'vue-router';
import { isLoggedIn, userRoles } from '@/stores/auth';
import AppLayout from '@/components/AppLayout.vue';
import Login       from '../views/Login.vue';
import Dashboard   from '../views/Dashboard.vue';
import Orders      from '../views/Orders.vue';
import Patients    from '../views/Patients.vue';
import Samples     from '../views/lab/Samples.vue';
import Tests       from '../views/lab/Tests.vue';
import Studies           from '../views/lab/Studies.vue';
import StudiesGroups     from '../views/lab/StudiesGroups.vue';
import AnalysesCategories from '../views/lab/AnalysesCategories.vue';
import Analyses    from '../views/lab/Analyses.vue';
import Biomaterials from '../views/lab/Biomaterials.vue';
import Containers  from '../views/lab/Containers.vue';
import Users       from '../views/Users.vue';
import Profile     from '../views/Profile.vue';

const ADMIN      = ['ADMIN'];
const RECEPTION  = ['ADMIN', 'RECEPTIONIST'];
const LAB        = ['ADMIN', 'MLT'];

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { public: true }
  },
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: Dashboard,
        meta: { title: 'Главная' }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: Orders,
        meta: { title: 'Заказы', roles: RECEPTION }
      },
      {
        path: 'patients',
        name: 'Patients',
        component: Patients,
        meta: { title: 'Пациенты', roles: RECEPTION }
      },
      {
        path: 'lab/samples',
        name: 'Samples',
        component: Samples,
        meta: { title: 'Образцы', roles: LAB }
      },
      {
        path: 'lab/tests',
        name: 'Tests',
        component: Tests,
        meta: { title: 'Тесты', roles: LAB }
      },
      {
        path: 'lab/studies',
        name: 'Studies',
        component: Studies,
        meta: { title: 'Исследования', roles: LAB }
      },
      {
        path: 'lab/studies/groups',
        name: 'StudiesGroups',
        component: StudiesGroups,
        meta: { title: 'Группы исследований', roles: LAB }
      },
      {
        path: 'lab/analyses/categories',
        name: 'AnalysesCategories',
        component: AnalysesCategories,
        meta: { title: 'Категории анализов', roles: LAB }
      },
      {
        path: 'lab/analyses',
        name: 'Analyses',
        component: Analyses,
        meta: { title: 'Анализы', roles: LAB }
      },
      {
        path: 'lab/biomaterials',
        name: 'Biomaterials',
        component: Biomaterials,
        meta: { title: 'Биоматериалы', roles: LAB }
      },
      {
        path: 'lab/containers',
        name: 'Containers',
        component: Containers,
        meta: { title: 'Контейнеры', roles: LAB }
      },
      {
        path: 'users',
        name: 'Users',
        component: Users,
        meta: { title: 'Пользователи', roles: ADMIN }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: Profile,
        meta: { title: 'Профиль' }
      },
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  // Не авторизован — на логин
  if (!to.meta.public && !isLoggedIn.value) {
    return { name: 'Login' };
  }

  // Проверка роли (только если роли уже загружены из localStorage)
  // Если userRoles пустой — пропускаем: App.vue загрузит их на mount
  if (to.meta.roles && userRoles.value.length > 0) {
    const hasAccess = to.meta.roles.some(r => userRoles.value.includes(r));
    if (!hasAccess) return { name: 'Dashboard' };
  }
});

export default router;
