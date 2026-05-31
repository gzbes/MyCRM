<template>
  <t-layout style="height: 100vh;">
    <t-aside :width="200">
      <div class="logo">My-CRM</div>
      <t-menu :value="activeMenu" @change="handleMenuChange">
        <t-menu-item value="dashboard">
          <template #icon><t-icon name="dashboard" /></template>
          经营概览
        </t-menu-item>
        <t-menu-item value="customers">
          <template #icon><t-icon name="user" /></template>
          客户管理
        </t-menu-item>
        <t-menu-item value="products">
          <template #icon><t-icon name="gift" /></template>
          产品管理
        </t-menu-item>
        <t-menu-item value="orders">
          <template #icon><t-icon name="order" /></template>
          订单管理
        </t-menu-item>
        <t-menu-item value="reports">
          <template #icon><t-icon name="chart" /></template>
          报表中心
        </t-menu-item>
      </t-menu>
    </t-aside>

    <t-layout>
      <t-header>
        <div class="header-content">
          <div class="header-title">{{ getPageTitle() }}</div>
          <div class="header-user">
            <span>{{ authStore.user?.name }}</span>
            <t-button theme="default" size="small" @click="handleLogout" style="margin-left: 16px;">
              退出登录
            </t-button>
          </div>
        </div>
      </t-header>

      <t-content style="padding: 24px;">
        <router-view />
      </t-content>
    </t-layout>
  </t-layout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { MessagePlugin } from 'tdesign-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const activeMenu = ref('dashboard')

watch(() => route.name, (newName) => {
  if (newName) {
    activeMenu.value = newName.toString().toLowerCase()
  }
}, { immediate: true })

const handleMenuChange = (value: string) => {
  router.push(`/${value}`)
}

const handleLogout = () => {
  authStore.logout()
  MessagePlugin.success('已退出登录')
  router.push('/login')
}

const getPageTitle = () => {
  const titles: Record<string, string> = {
    dashboard: '经营概览',
    customers: '客户管理',
    products: '产品管理',
    orders: '订单管理',
    reports: '报表中心'
  }
  return titles[activeMenu.value] || 'My-CRM'
}
</script>

<style scoped>
.logo {
  height: 64px;
  line-height: 64px;
  text-align: center;
  font-size: 20px;
  font-weight: bold;
  color: #fff;
  background: #0052d9;
}

.header-content {
  height: 64px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.header-title {
  font-size: 18px;
  font-weight: 500;
}

.header-user {
  display: flex;
  align-items: center;
}
</style>
