import { prisma } from "../../database/prisma";
import type { User } from "@prisma/client"

export type createUserInput = Readonly<{
    email: string;
    passwordHash: string;
}>

export class UserRepository {

    // find user by email to avoid duplicate
   
 async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
 }   

     // create user
 async create(data: createUserInput): Promise<User> {
     return prisma.user.create({
         data: {
            email: data.email,
            passwordHash: data.passwordHash
        }
    } );
 }   
}